import { readFileSync, readdirSync, readlinkSync } from "fs";

function killPort(port) {
  try {
    const tcp = readFileSync("/proc/net/tcp", "utf8");
    const hexPort = port.toString(16).toUpperCase().padStart(4, "0");
    const inodes = [];

    for (const line of tcp.split("\n").slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts[1] && parts[1].endsWith(":" + hexPort) && parts[3] === "0A") {
        inodes.push(parts[9]);
      }
    }

    if (inodes.length === 0) return;

    for (const pid of readdirSync("/proc")) {
      if (!/^\d+$/.test(pid)) continue;
      try {
        const fds = readdirSync(`/proc/${pid}/fd`);
        for (const fd of fds) {
          try {
            const link = readlinkSync(`/proc/${pid}/fd/${fd}`);
            if (inodes.some((inode) => link === `socket:[${inode}]`)) {
              process.kill(parseInt(pid), 9);
              console.log(`Killed PID ${pid} on port ${port}`);
            }
          } catch {}
        }
      } catch {}
    }
  } catch (e) {
    console.error("killport error:", e.message);
  }
}

killPort(5000);
killPort(8080);
