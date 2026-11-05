package com.anonymos.reach;

import com.comphenix.protocol.PacketType;
import com.comphenix.protocol.ProtocolLibrary;
import com.comphenix.protocol.events.ListenerPriority;
import com.comphenix.protocol.events.PacketAdapter;
import com.comphenix.protocol.events.PacketEvent;
import com.comphenix.protocol.wrappers.EnumWrappers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.entity.Entity;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class AnonymosPrivateReach extends JavaPlugin {
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
                    // No modo privado, o servidor assume a validação e aplicação do ataque.
                    event.setCancelled(true);
                    Bukkit.getScheduler().runTask(AnonymosPrivateReach.this, () -> applyPrivateHit(attackerId, targetEntityId));
                } catch (Exception ex) {
                    getLogger().fine("Pacote de ataque ignorado: " + ex.getMessage());
                }
            }
        });

        startApi();
        getLogger().info("ANONYMOS Private Reach carregado. Estado inicial: " + (reachEnabled ? "ON" : "OFF"));
    }

    private void applyPrivateHit(UUID attackerId, int targetEntityId) {
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

        // Dano processado pelo servidor; esta configuração existe apenas no servidor privado administrado pelo usuário.
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

    private void setReach(boolean enabled, double distance) {
        final double safeDistance = clamp(distance);
        Runnable update = () -> {
            reachDistance = safeDistance;
            reachEnabled = enabled;
            getConfig().set("reach.enabled", enabled);
            getConfig().set("reach.distance", reachDistance);
            saveConfig();
        };
        if (Bukkit.isPrimaryThread()) {
            update.run();
            return;
        }
        try {
            Bukkit.getScheduler().callSyncMethod(this, () -> { update.run(); return null; }).get(5, TimeUnit.SECONDS);
        } catch (Exception ex) {
            throw new IllegalStateException("Não foi possível aplicar a configuração na thread do servidor.", ex);
        }
    }

    private double clamp(double value) {
        if (Double.isNaN(value) || Double.isInfinite(value)) return 4.5;
        return Math.max(3.1, Math.min(6.0, value));
    }

    private void startApi() {
        if (!getConfig().getBoolean("api.enabled", true)) return;
        try {
            String host = getConfig().getString("api.host", "127.0.0.1");
            int port = getConfig().getInt("api.port", 8765);
            apiServer = HttpServer.create(new InetSocketAddress(host, port), 0);
            apiServer.createContext("/api/status", exchange -> handleApi(exchange, false));
            apiServer.createContext("/api/reach", exchange -> handleApi(exchange, true));
            apiServer.setExecutor(Executors.newSingleThreadExecutor(runnable -> {
                Thread thread = new Thread(runnable, "Anonymos-Reach-API");
                thread.setDaemon(true);
                return thread;
            }));
            apiServer.start();
            getLogger().info("API iniciada em http://" + host + ":" + port);
        } catch (IOException ex) {
            getLogger().severe("Não foi possível iniciar a API: " + ex.getMessage());
        }
    }

    private void handleApi(HttpExchange exchange, boolean reachEndpoint) throws IOException {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Authorization, Content-Type");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }

        String expected = getConfig().getString("api.token", "");
        String authorization = exchange.getRequestHeaders().getFirst("Authorization");
        String supplied = authorization != null && authorization.startsWith("Bearer ") ? authorization.substring(7) : "";
        if (!constantTimeEquals(expected, supplied)) {
            respond(exchange, 401, "{\"error\":\"unauthorized\"}");
            return;
        }

        if (!reachEndpoint && "GET".equalsIgnoreCase(exchange.getRequestMethod())) {
            respond(exchange, 200, "{\"enabled\":" + reachEnabled + ",\"distance\":" + reachDistance + ",\"maxDistance\":6.0,\"version\":\"1.0.0\"}");
            return;
        }
        if (reachEndpoint && "POST".equalsIgnoreCase(exchange.getRequestMethod())) {
            String body = new String(readRequestBody(exchange.getRequestBody()), StandardCharsets.UTF_8);
            Matcher enabledMatch = Pattern.compile("\"enabled\"\\s*:\\s*(true|false)").matcher(body);
            Matcher distanceMatch = Pattern.compile("\"distance\"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)").matcher(body);
            boolean enabled = enabledMatch.find() ? Boolean.parseBoolean(enabledMatch.group(1)) : reachEnabled;
            double distance = distanceMatch.find() ? Double.parseDouble(distanceMatch.group(1)) : reachDistance;
            setReach(enabled, distance);
            respond(exchange, 200, "{\"enabled\":" + reachEnabled + ",\"distance\":" + reachDistance + ",\"maxDistance\":6.0}");
            return;
        }
        respond(exchange, 405, "{\"error\":\"method_not_allowed\"}");
    }

    private byte[] readRequestBody(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[2048];
        int read;
        while ((read = input.read(buffer)) != -1) {
            if (output.size() + read > 4096) throw new IOException("Payload muito grande.");
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private boolean constantTimeEquals(String expected, String supplied) {
        if (expected == null || supplied == null) return false;
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), supplied.getBytes(StandardCharsets.UTF_8));
    }

    private void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=utf-8");
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }

    @Override
    public void onDisable() {
        if (apiServer != null) apiServer.stop(0);
        try {
            ProtocolLibrary.getProtocolManager().removePacketListeners(this);
        } catch (Exception ignored) {
            // O servidor pode estar encerrando antes de ProtocolLib.
        }
    }
}