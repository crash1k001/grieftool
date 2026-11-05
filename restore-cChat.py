from pathlib import Path
import base64
import hashlib
from urllib.request import urlopen

root = Path(__file__).resolve().parent
source = root / "cChat-1.1.jar.base64"
target = root / "cChat-1.1.jar"
expected = "3acfecf7c7b801d1270c2f7e2ffef5b0e0a719a0fc15b265291fa80d280fec82"
if source.exists():
    encoded = source.read_bytes()
else:
    url = "https://raw.githubusercontent.com/crash1k001/grieftool/ea0f4fb601f11428ec966144012d116f658d5123/cChat-1.1.jar.base64"
    with urlopen(url, timeout=60) as response:
        encoded = response.read()
data = base64.b64decode(b"".join(encoded.split()), validate=True)
if hashlib.sha256(data).hexdigest() != expected:
    raise SystemExit("Checksum mismatch: JAR was not written.")
if target.exists() and target.read_bytes() != data:
    raise SystemExit("A different cChat-1.1.jar already exists; move it first.")
target.write_bytes(data)
print("Ready:", target)
