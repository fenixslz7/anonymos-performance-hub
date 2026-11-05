package com.anonymos.reach;

import com.comphenix.protocol.PacketType;
import com.comphenix.protocol.ProtocolLibrary;
import com.comphenix.protocol.events.ListenerPriority;
import com.comphenix.protocol.events.PacketAdapter;
import com.comphenix.protocol.events.PacketEvent;
import com.comphenix.protocol.wrappers.EnumWrappers;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.event.Listener;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.scheduler.BukkitTask;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.OutputStream;\nimport java.io.InputStream;\nimport java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.Executors;\nimport java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class AnonymosPrivateReach extends JavaPlugin implements Listener {
    private volatile boolean reachEnabled;
    private volatile double reachDistance;
    private HttpServer apiServer;

    @Override
    public void onEnable() {
        saveDefaultConfig();
        if ("CHANGE-ME-ON-FIRST-START".equals(getConfig().getString("api.token", ""))) {
            getConfig().set("api.token", UUID.randomUUID().toString().replace("-", "") + UUID.randomUUID().toString().replace("-", ""));
            saveConfig();
            getLogger().warning("Token da API gerado. Copie api.token do config.yml para conectar o painel.");
        }
        reachEnabled = getConfig().getBoolean("reach.enabled", false);
        reachDistance = clamp(getConfig().getDouble("reach.distance", 4.5));
        getCommand("anonymosreach").setExecutor((sender, command, label, args) -> {
            if (!sender.hasPermission("anonymosreach.admin")) {
                sender.sendMessage(ChatColor.RED + "Sem permissão.");
                return true;
            }
            if (args.length == 1 && "on".equalsIgnoreCase(args[0])) {
                setReach(true, reachDistance);
                sender.sendMessage(ChatColor.GREEN + "Private Reach ativado: " + reachDistance + " blocos.");
            } else if (args.length == 1 && "off".equalsIgnoreCase(args[0])) {
                setReach(false, reachDistance);
                sender.sendMessage(ChatColor.YELLOW + "Private Reach desativado.");
            } else if (args.length == 1) {
                try {
                    setReach(reachEnabled, Double.parseDouble(args[0]));
                    sender.sendMessage(ChatColor.GREEN + "Distância definida para " + reachDistance + " blocos.");
                } catch (NumberFormatException ex) {
                    sender.sendMessage(ChatColor.RED + "Use /anonymosreach <on|off|distância>.");
                }
            } else {
                sender.sendMessage(ChatColor.AQUA + "Reach: " + (reachEnabled ? "ON" : "OFF") + " · " + reachDistance + " blocos.");
            }
            return true;
        });

        ProtocolLibrary.getProtocolManager().addPacketListener(new PacketAdapter(this, ListenerPriority.NORMAL, PacketType.Play.Client.USE_ENTITY) {
            @Override
            public void onPacketReceiving(PacketEvent event) {
                if (!reachEnabled || event.getPlayer() == null) return;
                try {
                    if (event.getPacket().getEntityUseActions().read(0) != EnumWrappers.EntityUseAction.ATTACK) return;
                    int targetEntityId = event.getPacket().getIntegers().read(0);
                    UUID attackerId = event.getPlayer().getUniqueId();
                    // Quando o modo privado está ativo, o servidor assume a validação e aplicação do golpe.
                    event.setCancelled(true);
                    Bukkit.getScheduler().runTask(AnonymosPrivateReach.this, () -> applyPrivateHit(attackerId, targetEntityId));
                } catch (Exception ex) {
                    getLogger().fine("Pacote de ataque ignorado: " + ex.getMessage());
                }
            }
        });    private void applyPrivateHit(UUID attackerId, int targetEntityId) {
        Player attacker = Bukkit.getPlayer(attackerId);
        if (attacker == null || !attacker.isOnline() || !reachEnabled) return;
        Entity target = null;
        for (Entity candidate : attacker.getWorld().getEntities()) {
            if (candidate.getEntityId() == targetEntityId) {
                target = candidate;
                break;
            }
        }
        if (target == null || target == attacker || !target.isValid() || !target.getWorld().equals(attacker.getWorld())) return;
        double distance = attacker.getEyeLocation().distance(target.getLocation().add(0, 0.9, 0));
        if (distance > reachDistance) return;
        target.damage(getAttackDamage(attacker), attacker);
    }

    private double getAttackDamage(Player player) {
        String material = player.getItemInHand() == null ? "AIR" : player.getItemInHand().getType().name();
        double damage = 1.0;
        if (material.endsWith("_SWORD")) {
            if (material.startsWith("WOOD") || material.startsWith("GOLD")) damage = 4.0;
            else if (material.startsWith("STONE")) damage = 5.0;
            else if (material.startsWith("IRON")) damage = 6.0;
            else if (material.startsWith("DIAMOND")) damage = 7.0;
        } else if (material.endsWith("_AXE")) {
            if (material.startsWith("WOOD") || material.startsWith("GOLD")) damage = 3.0;
            else if (material.startsWith("STONE")) damage = 4.0;
            else if (material.startsWith("IRON")) damage = 5.0;
            else if (material.startsWith("DIAMOND")) damage = 6.0;
        } else if (material.endsWith("_PICKAXE")) {
            if (material.startsWith("WOOD") || material.startsWith("GOLD")) damage = 2.0;
            else if (material.startsWith("STONE")) damage = 3.0;
            else if (material.startsWith("IRON")) damage = 4.0;
            else if (material.startsWith("DIAMOND")) damage = 5.0;
        } else if (material.endsWith("_SPADE")) {
            if (material.startsWith("WOOD") || material.startsWith("GOLD")) damage = 1.0;
            else if (material.startsWith("STONE")) damage = 2.0;
            else if (material.startsWith("IRON")) damage = 3.0;
            else if (material.startsWith("DIAMOND")) damage = 4.0;
        }
        if (player.getItemInHand() != null) {
            damage += player.getItemInHand().getEnchantmentLevel(org.bukkit.enchantments.Enchantment.DAMAGE_ALL) * 1.25;
        }
        return damage;
    }
}