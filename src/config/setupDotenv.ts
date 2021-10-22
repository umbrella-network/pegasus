import dotenv from 'dotenv';

(async () => {
  if (process.env.NODE_ENV === 'testing') {
    await dotenv.config({path: '.testing.env'});
  } else {
    await dotenv.config();
  }
})();
