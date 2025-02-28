# WebConsole

Full Credit goes to [Mesacarlos](https://github.com/mesacarlos) for Creating [WebConsole](https://github.com/mesacarlos/WebConsole)!

This is a Project made to make it possible to use WebConsole with a Coudflare secured Domain.
## All three files are required for this Project to function.

# How to install:

## 1. Download the latest Release From here

## 2. Follow [Mesacarlos's Install Instructions](https://github.com/mesacarlos/WebConsole), but using the Files from here.

## 3. Install Python and the `websockets`,`ssl` modules.

## 4. Edit Redirector.py to your liking. 

### In Redirector.py:

#### Set `SSL_ENABLED` to True if you want to use the client over https and connect to the Server over ssl
```
SSL_ENABLED = True 
```

#### If the Above Setting is set to True, Set these to the ssl Key and Certificate File
```
SSL_Key = "/home/certs/key.pem" # The Path to the SSL Key
SSL_Cert = "/home/certs/cert.pem" # The Path to the SSL Cert
```


#### If you want to use `SSL_ENABLED`, you need to set this to a [CloudFlare Supported Https Port](https://developers.cloudflare.com/fundamentals/reference/network-ports/).

```
Main_port = 2083 
```

#### This is the Port Mapping. For Each Server you want to Connect you need to add an entry here with the port specified in the config.yml of the Plugin on each Server. They should be ports you wont otherwise use and dont need to be Supported by cloudflare. They also shouldnt be whitelisted in your firewall.

```
port_mapping = { 
    "/hub": 327, 
    "/smp": 330  
}
```
## 5. Run ```nohup python3 Redirector.py``` in the Directory where Redirector.py is located.

## 5.5 Make sure to Allow the port you chose as `Main_port` in your Firewall.

## 6. In the client, Create the server with these Parameters: 

#### Server IP: Your server ip. Always should be the same
#### Port: The Port you set in `Main_port`
#### Path: The First Part you set in the `port_mapping`

### Examples:
```
Name: Hub
Ip: mc.myserver.com
Port: 2083
Path: /hub
```

```
Name: Smp Sverer
Ip: mc.myserver.com
Port: 2083
Path: /smp
```





This Project Uses the 2.4 Client Build Of Webconsole because 2.5+ Uses Angular Client.
