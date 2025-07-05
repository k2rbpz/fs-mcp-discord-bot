# Server Maintenance Documentation for Discord Bot on Google Compute Engine

This document outlines essential maintenance tasks for your Dockerized Discord bot application running on a Google Compute Engine (GCE) instance.

## 1. Accessing the VM

To perform any maintenance tasks, you first need to connect to your GCE VM via SSH.

```bash
gcloud compute ssh discord-bot-vm --project=pine-vision-sql-studio --zone=us-central1-a
```
(Replace `us-central1-a` with your actual zone if different.)

## 2. Checking Application Status

Once connected to the VM, you can check the status of your Docker container.

### 2.1 Check if the container is running
```bash
docker ps
```
This command lists all running Docker containers. Look for a container named `discord-bot`. If it's not listed, it's not running.

### 2.2 Check all containers (running and stopped)
```bash
docker ps -a
```
This shows all containers, including those that have stopped, which can help diagnose if the container exited unexpectedly.

## 3. Viewing Application Logs

Logs are crucial for debugging. Your application's output is captured by Docker.

### 3.1 View live logs
```bash
docker logs -f discord-bot
```
This command will stream the logs from your `discord-bot` container in real-time. Press `Ctrl+C` to stop streaming.

### 3.2 View past logs
```bash
docker logs discord-bot
```
This will show all logs from the container's last run.

## 4. Managing the Application Container

### 4.1 Restart the container
If the bot is unresponsive or you suspect an issue, a simple restart can often resolve it.
```bash
docker restart discord-bot
```

### 4.2 Stop the container
```bash
docker stop discord-bot
```

### 4.3 Start the container (if stopped)
```bash
docker start discord-bot
```

## 5. Updating the Application

To deploy a new version of your Discord bot (after making code changes):

### 5.1 On your Local Machine:
1.  **Build and tag the Docker image** for Google Container Registry (ensure you're in your project's root directory):
    ```bash
    docker build --platform linux/amd64 -t gcr.io/pine-vision-sql-studio/fs-mcp-discord-mastra2 .
    ```
2.  **Push the updated image** to GCR:
    ```bash
    docker push gcr.io/pine-vision-sql-studio/fs-mcp-discord-mastra2
    ```

### 5.2 On your GCE VM (via SSH):
1.  **Stop the current running container:**
    ```bash
    docker stop discord-bot
    ```
2.  **Remove the old container instance:**
    ```bash
    docker rm discord-bot
    ```
3.  **Pull the newly pushed image:**
    ```bash
    docker pull gcr.io/pine-vision-sql-studio/fs-mcp-discord-mastra2
    ```
4.  **Run the new container instance** (remember to include your `FLIPSIDE_API_KEY`):
    ```bash
    docker run -d --restart=always --name discord-bot -e FLIPSIDE_API_KEY="YOUR_FLIPSIDE_API_KEY_HERE" gcr.io/pine-vision-sql-studio/fs-mcp-discord-mastra2
    ```

## 6. Basic VM Maintenance

### 6.1 Update VM packages
It's good practice to keep your VM's operating system packages updated.
```bash
sudo apt update && sudo apt upgrade -y
```

### 6.2 Reboot the VM
If necessary, you can reboot the entire VM. Your Docker container is configured to restart automatically (`--restart=always`) after a reboot.
```bash
sudo reboot
```
(This will disconnect your SSH session.)

## 7. Monitoring

For more advanced monitoring, consider using Google Cloud's operations suite (formerly Stackdriver) for VM metrics, custom dashboards, and alerting. You can access this via the Google Cloud Console.
