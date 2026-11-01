package fun.grieftool.bridge;

import com.google.gson.*;
import org.bukkit.Bukkit;
import org.bukkit.command.*;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import java.io.*;
import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;

/** Outbound HTTPS only. Rewards are at-most-once; uncertain outcomes need manual review. */
public final class GriefToolBridge extends JavaPlugin {
 private final Gson gson=new Gson();
 private final Set<UUID> busy=ConcurrentHashMap.newKeySet();
 private final Map<String,List<String>> rewards=new HashMap<>();
 private final Map<String,JsonObject> journal=new LinkedHashMap<>();
 private final ExecutorService worker=Executors.newSingleThreadExecutor();
 private HttpClient client; private String base,token; private Path journalPath; private boolean checkAuth;
 @Override public void onEnable(){
  saveDefaultConfig();
  try{
   base=getConfig().getString("site-url","").replaceAll("/+$",""); token=getConfig().getString("bridge-token","");
   URI uri=URI.create(base);if(uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||(!"https".equals(uri.getScheme())&&!("http".equals(uri.getScheme())&&getConfig().getBoolean("allow-insecure-http",false))))throw new IllegalArgumentException("site-url must be HTTPS");
   if(token.length()<32)throw new IllegalArgumentException("Set bridge-token (at least 32 characters)");
   checkAuth=getConfig().getBoolean("check-authme",true);
   org.bukkit.configuration.ConfigurationSection section=getConfig().getConfigurationSection("rewards");
   if(section!=null)for(String key:section.getKeys(false)){List<String> commands=section.getStringList(key);if(!commands.isEmpty()&&commands.stream().allMatch(c->!c.isBlank()&&!c.startsWith("/")&&!c.contains("\n")&&!c.contains("\r")))rewards.put(key,List.copyOf(commands));}
   journalPath=getDataFolder().toPath().resolve("rewards.jsonl");
   if(Files.exists(journalPath))for(String line:Files.readAllLines(journalPath,StandardCharsets.UTF_8)){if(line.isBlank())continue;JsonObject entry=JsonParser.parseString(line).getAsJsonObject();journal.put(entry.get("id").getAsString(),entry);}
   client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).followRedirects(HttpClient.Redirect.NEVER).build();
   Objects.requireNonNull(getCommand("gtclaim")).setExecutor(this);
   Bukkit.getScheduler().runTaskTimer(this,()->{int online=Bukkit.getOnlinePlayers().size();worker.execute(()->heartbeat(online));},20L,600L);
   getLogger().info("GriefTool Bridge enabled. Rewards require in-game confirmation.");
  }catch(Exception e){getLogger().severe("Bridge disabled: "+e.getMessage());Bukkit.getPluginManager().disablePlugin(this);}
 }
 @Override public void onDisable(){worker.shutdown();}
 private boolean authenticated(Player player){
  if(!checkAuth||Bukkit.getPluginManager().getPlugin("AuthMe")==null)return true;
  try{Class<?> api=Class.forName("fr.xephi.authme.api.v3.AuthMeApi");Object instance=api.getMethod("getInstance").invoke(null);return (Boolean)api.getMethod("isAuthenticated",Player.class).invoke(instance,player);}catch(Exception e){return false;}
 }
 @Override public boolean onCommand(CommandSender sender,Command command,String label,String[] args){
  if(!(sender instanceof Player)){sender.sendMessage("Команду должен выполнить игрок в игре.");return true;}
  Player player=(Player)sender;
  if(args.length!=1||!args[0].matches("[a-fA-F0-9]{32}")){player.sendMessage("§6Собери тыквы на сайте и введи /gtclaim <код с сайта>.");return true;}
  if(!authenticated(player)){player.sendMessage("§cСначала авторизуйся на сервере.");return true;}
  UUID uuid=player.getUniqueId();String name=player.getName(),code=args[0].toLowerCase(Locale.ROOT);
  if(!busy.add(uuid)){player.sendMessage("§eПредыдущая заявка ещё обрабатывается.");return true;}
  player.sendMessage("§6Проверяем награду…");
  worker.execute(()->{
   try{
    JsonObject body=new JsonObject();body.addProperty("nickname",name);body.addProperty("uuid",uuid.toString());body.addProperty("code",code);body.add("availableCampaigns",gson.toJsonTree(rewards.keySet()));
    JsonObject reward=post("redeem",body);String id=reward.get("id").getAsString(),campaign=reward.get("campaign").getAsString();
    // Persist intent and fsync BEFORE scheduling any console command.
    if(journal.containsKey(id))throw new IOException("Награда уже обрабатывалась. Обратись в поддержку.");
    JsonObject entry=new JsonObject();entry.addProperty("id",id);entry.addProperty("nickname",name);entry.addProperty("status","review");append(entry);
    List<String> commands=rewards.get(campaign);
    if(commands==null){ack(entry);throw new IOException("Награда не настроена. Администрация проверит заявку.");}
    if(!isEnabled())return;
    Bukkit.getScheduler().runTask(this,()->{
     boolean success=true;Player current=Bukkit.getPlayer(uuid);
     if(current==null||!current.isOnline()||!authenticated(current))success=false;
     else for(String cmd:commands){try{if(!Bukkit.dispatchCommand(Bukkit.getConsoleSender(),cmd.replace("{player}",name).replace("{uuid}",uuid.toString()))){success=false;break;}}catch(Exception e){success=false;break;}}
     final boolean done=success;
     if(!worker.isShutdown())worker.execute(()->{try{JsonObject result=entry.deepCopy();result.addProperty("status",done?"delivered":"review");append(result);ack(result);}catch(Exception e){getLogger().warning("Reward outcome pending review: "+id);}finally{busy.remove(uuid);}});
     if(current!=null)current.sendMessage(done?"§aКоманды награды выполнены! Спасибо за участие.":"§eВыдачу нужно проверить. Напиши в поддержку сайта.");
    });
   }catch(Exception e){busy.remove(uuid);message(uuid,"§e"+e.getMessage());}
  });return true;
 }
 private void message(UUID uuid,String text){if(isEnabled())Bukkit.getScheduler().runTask(this,()->{Player p=Bukkit.getPlayer(uuid);if(p!=null)p.sendMessage(text);});}
 private JsonObject post(String route,JsonObject body)throws Exception{
  HttpRequest request=HttpRequest.newBuilder(URI.create(base+"/api/bridge/"+route)).timeout(Duration.ofSeconds(12)).header("Authorization","Bearer "+token).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(gson.toJson(body))).build();
  HttpResponse<String> response=client.send(request,HttpResponse.BodyHandlers.ofString());
  JsonObject result;try{result=JsonParser.parseString(response.body()).getAsJsonObject();}catch(Exception e){throw new IOException("Сайт временно недоступен. Попробуй позже.");}
  if(response.statusCode()!=200)throw new IOException(result.has("error")?result.get("error").getAsString():"Ошибка связи с сайтом");return result;
 }
 private void append(JsonObject entry)throws IOException{
  try(FileOutputStream out=new FileOutputStream(journalPath.toFile(),true)){out.write((gson.toJson(entry)+"\n").getBytes(StandardCharsets.UTF_8));out.getFD().sync();}journal.put(entry.get("id").getAsString(),entry);
 }
 private void ack(JsonObject entry)throws Exception{post("ack",entry);JsonObject acknowledged=entry.deepCopy();acknowledged.addProperty("acknowledged",true);append(acknowledged);}
 private void heartbeat(int online){try{
  JsonObject body=new JsonObject();body.addProperty("version","1.0.0");body.addProperty("online",online);post("heartbeat",body);
  // Only retry status reporting, NEVER reward commands. Skip active in-flight operations.
  for(JsonObject entry:new ArrayList<>(journal.values()))if(!entry.has("acknowledged")&&busy.isEmpty())ack(entry);
 }catch(Exception e){getLogger().warning("Website unavailable or bridge key rejected; will retry connection in 30 seconds.");}}
}
