import { readLines } from "https://deno.land/std@v0.51.0/io/bufio.ts";
import { blue, green, red, yellow } from "https://deno.land/std@0.51.0/fmt/colors.ts";
import { serve } from "https://deno.land/std@0.51.0/http/server.ts";
import {
  acceptWebSocket,
  connectWebSocket,
  isWebSocketCloseEvent,
  isWebSocketPingEvent,
} from "https://deno.land/std/ws/mod.ts";

async function prompt(question = '') {
  console.log(blue(question));
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  const answer = new TextDecoder().decode(buf.subarray(0, n));
  return answer.trim();
}

async function host(port=565) {
  // Currently broken???
  for await (const req of serve(":"+port)) {
    console.log("sa");
    const { conn, bufReader, bufWriter, headers } = req;
    try {
      const sock = await acceptWebSocket({conn, bufReader, bufWriter, headers});

      console.log(blue("Hosting at "+addr+":"+port));

      try {
        for await (const ev of sock) {
          if (typeof ev === "string") { // text message
            console.log(yellow(ev), ev);
            await sock.send("Got'ya");
          } else if (isWebSocketCloseEvent(ev)) { // close
            const { code, reason } = ev;
            console.log(yellow("Close"), code, reason);
          }
        }
      } catch (err) {
        console.error(`failed to receive frame: ${err}`);
        if (!sock.isClosed) await sock.close(1000).catch(console.error);
      }

    } catch (err) {
      console.error(`failed to accept websocket: ${err}`);
      await req.respond({ status: 400 });
    }
  }
}

async function join(addr="127.0.0.1", port=565) {

  try {
    console.log(blue("Joining "+addr+":"+port));
    const endpoint = "ws://"+addr+":"+port;

    const sock = await connectWebSocket(endpoint);
    console.log(blue("Connected! (type 'close' to quit)"));

    while (true) {
      const line = await prompt("Send message: ");
      console.log(green(line));
      if (line === "close") break;
      else if (line !== null) sock.send(line);

      const message = async () => {
        for await (const msg of sock)
          console.log(yellow(msg));
      };
    }

    if (!sock.isClosed) {
      await sock.close(1000).catch(console.error);
    }

  } catch (err) {
    console.error(red(`Could not connect to WebSocket: '${err}'`));
  }

}

const s = await prompt("Do you want to join? [Y/n]: ");
if (s=="n") host();
else join();
