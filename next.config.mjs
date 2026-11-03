const production=process.env.NODE_ENV==='production';
const csp=[
 "default-src 'self'",
 "script-src 'self' 'unsafe-inline'"+(production?"":" 'unsafe-eval'"),
 "style-src 'self' 'unsafe-inline'",
 "img-src 'self' data: https:",
 "font-src 'self'",
 "connect-src 'self'"+(production?"":" ws: wss:"),
 "object-src 'none'","base-uri 'self'","frame-ancestors 'none'","form-action 'self'",
].join('; ');
export default {
 output:'standalone',poweredByHeader:false,devIndicators:false,experimental:{cpus:2},
 async headers(){return [{source:'/(.*)',headers:[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
 {key:'Content-Security-Policy',value:csp},
 ]}];}
};
