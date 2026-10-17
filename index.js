require('dotenv').config();
const { Client, GatewayIntentBits, AttachmentBuilder } = require('discord.js');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

const imagesDir = path.join(__dirname, 'images');

// Track last used index to avoid repeating the same image consecutively
let lastIndex = -1;

function getRandomImage() {
  const images = fs.readdirSync(imagesDir).filter(f =>
    /\.(png|jpe?g|gif|webp)$/i.test(f)
  );

  if (images.length === 0) throw new Error('No images found in the images/ folder.');

  let index;
  do {
    index = Math.floor(Math.random() * images.length);
  } while (index === lastIndex && images.length > 1);
  lastIndex = index;
  return images[index];
}

async function postDailyImage() {
  const channelIds = process.env.CHANNEL_IDS.split(',').map(id => id.trim()).filter(Boolean);

  const filename = getRandomImage();
  const filepath = path.join(imagesDir, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`Image file not found: ${filepath}`);
    return;
  }

  for (const channelId of channelIds) {
    try {
      const channel = await client.channels.fetch(channelId);

      if (!channel || !channel.isTextBased()) {
        console.error(`Channel ${channelId} not found or is not a text channel.`);
        continue;
      }

      const attachment = new AttachmentBuilder(filepath, { name: filename });
      await channel.send({ files: [attachment] });
      console.log(`[${new Date().toISOString()}] Posted ${filename} to channel ${channelId}`);
    } catch (err) {
      console.error(`Failed to post to channel ${channelId}:`, err.message);
    }
  }
}

client.once('clientReady', () => {
  console.log(`Logged in as ${client.user.tag}`);

  // Schedule: 10 PM UTC+7, using Asia/Bangkok timezone
  cron.schedule('0 22 * * *', () => {
    console.log('Cron triggered — posting daily image...');
    postDailyImage().catch(console.error);
  }, {
    timezone: 'Asia/Bangkok'
  });

  console.log('Scheduler set: posts daily at 22:00 Asia/Bangkok (UTC+7)');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (message.content.trim().toLowerCase() !== 'gn') return;

  const filename = getRandomImage();
  const filepath = path.join(imagesDir, filename);

  if (!fs.existsSync(filepath)) {
    console.error(`Image file not found: ${filepath}`);
    return;
  }

  const attachment = new AttachmentBuilder(filepath, { name: filename });
  await message.channel.send({ files: [attachment] });
  console.log(`[${new Date().toISOString()}] Posted ${filename} via gn command in channel ${message.channel.id}`);
});

client.login(process.env.DISCORD_TOKEN);
