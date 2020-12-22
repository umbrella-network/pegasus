import fs from 'fs';
import path from 'path';
import Feed from 'src/models/Feed';

export default async function loadFeeds(filePath: string): Promise<Feed[]> {
  return new Promise((resolve, reject) => {
     fs.readFile(path.resolve(__dirname, filePath), 'utf-8', (err, feedData) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(JSON.parse(feedData).data as Feed[]);
    });
  });
}
