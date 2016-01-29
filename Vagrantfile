$script = <<SCRIPT
wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.30.2/install.sh | bash
echo "source /home/vagrant/.nvm/nvm.sh" >> /home/vagrant/.profile
source /home/vagrant/.profile
nvm install stable
SCRIPT

Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/trusty64"
  config.vm.provision "shell", privileged: false, inline: $script
end
