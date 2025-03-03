#!/bin/bash

# Update system packages
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install AWS CLI
sudo yum install -y aws-cli

# Create directory for the application
mkdir -p ~/quickchat

# Start Docker service on boot
sudo systemctl enable docker

# Basic security: Configure firewall (if not already done through AWS Security Groups)
sudo yum install -y iptables-services
sudo systemctl start iptables
sudo systemctl enable iptables

# Allow SSH (22), HTTP (80), HTTPS (443), and app port (3000)
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT

# Save iptables rules
sudo service iptables save
