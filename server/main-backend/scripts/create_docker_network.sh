# Create macvlan network (you probably already did this)
docker network create -d macvlan \
  --subnet=192.168.1.0/24 \
  --gateway=192.168.1.1 \
  -o parent=eth0 \
  macvlan_net

# Create container with both networks
docker create --name myvm \
  --network macvlan_net \
  --network-alias vm \
  -p 22 \
  ubuntu:latest /bin/bash

# Connect bridge network additionally
docker network connect bridge myvm

# Start the container
docker start myvm
# 2. Then, add a macvlan interface on the host that can talk to containers:
sudo ip link add mac0 link eth0 type macvlan mode bridge
sudo ip addr add 192.168.1.200/24 dev mac0
sudo ip link set mac0 up
