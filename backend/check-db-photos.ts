import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const col = mongoose.connection.collection('hotwheelscars');
  const total = await col.countDocuments();
  const withPhoto = await col.countDocuments({photo_url: {$exists: true, $nin: [null, '']}});
  const wikiFile = await col.countDocuments({photo_url: {$regex: /^wiki-file:/}});
  const httpUrl = await col.countDocuments({photo_url: {$regex: /^https?:/}});
  const naPhoto = await col.countDocuments({photo_url: 'N/A'});
  const noPhoto = total - withPhoto;
  console.log('MongoDB Stats:');
  console.log('Total:', total);
  console.log('With photo_url:', withPhoto);
  console.log('  wiki-file:', wikiFile);
  console.log('  http:', httpUrl);
  console.log('  N/A:', naPhoto);
  console.log('Without photo:', noPhoto);
  await mongoose.disconnect();
}
check();
