# ANONYMOS Private Reach — Minecraft 1.8.x

Companion plugin for a server privately owned and administered by you. The desktop panel controls the server-side reach value; it does not patch or inject into the Minecraft client.

## Requirements

- Spigot or Paper compatible with the 1.8.8 server API (Minecraft 1.8.9 clients can join).
- Java 8.
- ProtocolLib 4.8.0 installed on the server.
- Maven 3.8+ to build the plugin.

## Build

From this directory:

```bash
mvn clean package
```

The jar is created at `target/ANONYMOS-Private-Reach-1.8.9.jar`. A GitHub Actions workflow also builds it on pushes that change this plugin and publishes the JAR as an artifact when the build succeeds.

## Install

1. Stop your private server.
2. Put ProtocolLib 4.8.0 and the generated ANONYMOS jar in the server's `plugins/` folder.
3. Start the server once. The plugin creates `plugins/AnonymosPrivateReach/config.yml` and generates a random API token.
4. Copy the value of `api.token` from that config file.
5. Open ANONYMOS PERFORMANCE → Minecraft 1.8.9, enter the API URL and token, then select **Testar conexão**.
6. Enable Private Reach and apply a distance between 3.1 and 6.0 blocks.

The default API bind is `127.0.0.1:8765`, intended for a server running on the same PC as the panel. For a server on another machine in your private LAN, set `api.host: "0.0.0.0"`, restrict TCP port 8765 in the machine firewall to your LAN/panel IP, restart the server, and use the server's private LAN address in the panel. Do not forward this port to the public internet.

## Server commands

- `/anonymosreach` — show current state.
- `/anonymosreach on` — enable.
- `/anonymosreach off` — disable.
- `/anonymosreach 4.8` — set distance in blocks.

Only operators (permission `anonymosreach.admin`) can use the command.

## API

All endpoints require `Authorization: Bearer <api.token>`.

- `GET /api/status` — returns enabled state and distance.
- `POST /api/reach` — JSON body: `{"enabled":true,"distance":4.8}`.

The plugin handles attack packets server-side only while Private Reach is enabled. It caps range at 6.0 blocks and persists settings in config.yml. This first delivery does not include client-side ESP or Auto Clicker; those require a separate Minecraft 1.8.9 client integration and are explicitly marked pending in the panel.

## Important

Use this plugin only on a private server you control and where participants know the test rules. The API token is a server control credential; keep it private. The plugin is an initial implementation and must be tested on your exact Spigot/Paper build before using it in a live world.