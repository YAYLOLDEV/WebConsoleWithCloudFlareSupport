import asyncio
import websockets
import json,ssl

SSL_ENABLED = True # Set This To True If You Are Using SSL to connect to the Redirector. In any Way Set SSL In the Plugin Config to False.
SSL_Key = "/home/certs/key.pem" # The Path to the SSL Key
SSL_Cert = "/home/certs/cert.pem" # The Path to the SSL Cert

                 # The port The Redirector Should Run on, Its the one you need to connect to In the Webconsole Client.
Main_port = 2083 # If you are using Cloudflare, Visit https://developers.cloudflare.com/fundamentals/reference/network-ports/
                 # And Check That you are Using A supported Port. If you are using Ssl, Use a Supported Https Port.

port_mapping = { # This is The port Mapping, Its the Ports That you are Connecting to, Based On which Patch you are Using.
    "/hub": 327, # Eg. "/hub" : 327 If you are connecting to URL:PORT/hub (The thing You need to Set In the Webconsole Plugin)
    "/smp": 330  # You will be redirected to The port 327 No matter if Cloudflare Supports it or Not
}


async def relay(websocket, path):
    # Get the port from the port mapping
    port = port_mapping.get(path, None)
    if port is None:
        # If the path is not in the mapping, close the connection
        await websocket.close()
        return

    # Create a new WebSocket connection to the target server
    target_url = f"ws://localhost:{port}"
    target_ws = await websockets.connect(target_url)
    # Forward messages from the client to the target server
    async def forward_to_target():
        async for message in websocket:
                await target_ws.send(message)

    # Forward messages from the target server to the client
    async def forward_from_target():
        async for message in target_ws:
            await websocket.send(message)

    async def on_close(close_status, close_message):
        print(f"Connection closed with status {close_status} and message {close_message}")

    await asyncio.gather(forward_to_target(), forward_from_target())

if SSL_ENABLED:
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(SSL_Cert,SSL_Key)
    start_server = websockets.serve(relay,port=Main_port,ssl=ssl_context)
else:
    start_server = websockets.serve(relay,port=Main_port)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
