# 🛰️ Registry Radar Agent  

[![GitHub Release](https://img.shields.io/github/v/release/andrewbusbee/registry-radar-agent?color=4CAF50&label=Release)](https://github.com/andrewbusbee/registry-radar-agent/releases)
[![Docker Image](https://img.shields.io/docker/pulls/andrewbusbee/registry-radar-agent?color=2496ED&logo=docker&label=Docker)](https://hub.docker.com/r/andrewbusbee/registry-radar-agent)
[![License](https://img.shields.io/github/license/andrewbusbee/registry-radar-agent?color=blue?branch=main&cacheSeconds=60&v=4)](https://github.com/andrewbusbee/registry-radar-agent/blob/main/LICENSE)
[![Build Status](https://img.shields.io/github/actions/workflow/status/andrewbusbee/registry-radar-agent/docker-build.yml?label=Build&logo=githubactions)](https://github.com/andrewbusbee/registry-radar-agent/actions)


> A lightweight companion service for **[Registry Radar](https://github.com/andrewbusbee/registry-radar)** that extends its monitoring reach across remote hosts.

---

## 🔍 Overview  

**Registry Radar Agent** continuously monitors Docker containers on remote machines and securely reports their state to a central **Registry Radar** server.  
It’s tightly integrated with the Registry Radar ecosystem and **not intended for standalone use**.

---

## ⚙️ Core Features  

- 🐳 **Docker Container Monitoring** – Automatically discovers and tracks all containers running on the host  
- ⚡ **Real-Time Updates** – Instantly reports container state changes (running, stopped, exited)  
- 🔍 **Automatic Discovery** – Detects new containers as they’re created and adds them to monitoring  
- 🌐 **Multi-Agent Support** – Deploy agents on multiple hosts, all reporting to the same Radar server  
- 🧩 **Automatic Enrollment** – Uses one-time enrollment tokens for secure registration  
- 🔒 **WebSocket + JWT Security** – Persistent encrypted communication channel  
- 🏷️ **Smart Tag Parsing** – Handles Docker image names and tags accurately (e.g., `nginx:1.21`, `postgres:13-alpine`)

---

## 🧭 How It Works  

1. **Enrollment** – Agent registers with Registry Radar using a one-time enrollment token  
2. **Authentication** – Exchanges and renews JWT tokens for secure communication  
3. **WebSocket Connection** – Maintains a live channel with the Radar server  
4. **Container Discovery** – Scans and catalogs all Docker containers on the host  
5. **Status Monitoring** – Subscribes to Docker events for continuous updates  
6. **Data Reporting** – Sends structured container data every 30 seconds  

---

## 🌎 Environment Variables  

| Variable | Description | Example |
|-----------|--------------|----------|
| `SERVER_URL` | Registry Radar server endpoint | `https://your-registry-radar-host` |
| `AGENT_ID` | Unique identifier for this agent | `agent-001` |
| `AGENT_ENROLL_TOKEN` | One-time enrollment token (from the UI) | `abc123xyz` |
| `REFRESH_SECRET` | Persistent refresh secret (set after enrollment) | — |
| `AGENT_LOG_LEVEL` | Optional logging level (default: `info`) | `debug` |

---

## 🚀 Deployment  

Agents are deployed via **Docker Compose files generated automatically** by the Registry Radar web interface.

1. Open the **Agents** tab in Registry Radar  
2. Click **“Add Agent”** and provide a name  
3. Copy the generated Docker Compose snippet  
4. Deploy it on your remote host  

Once launched, the agent will securely connect and begin reporting container data.

---

## ⚠️ Important Notes  

- 🔗 **Registry Radar Required** – The agent only functions with an active Registry Radar server  
- 🧭 **Not Standalone** – It’s a supporting component, not a full monitoring tool  
- 🔐 **Secure by Design** – Uses JWT + enrollment tokens for authentication  
- 🐋 **Docker Dependency** – Requires Docker to be installed and accessible on the host  

---

## 🪪 License  

This project is licensed under the **MIT License**.  
See the [LICENSE](./LICENSE) file for details.

---

## 🤖 AI-Assisted Development  

This project was developed with the help of **modern AI coding tools** to accelerate prototyping and implementation.  

- AI assisted in scaffolding, boilerplate generation, and code suggestions  
- All code was **reviewed, refined, and tested by humans** before release  
- The use of AI enabled faster iteration, architectural clarity, and higher overall quality  

💡 *Community feedback and contributions are encouraged to further enhance this project.*

