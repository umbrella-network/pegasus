import './boot';
import Application from './lib/Application';
import LeadershipDetectionWorker from './workers/LeadershipDetectionWorker';

const leadershipDetectionWorker: LeadershipDetectionWorker = Application.get(LeadershipDetectionWorker);

const schedule = async (): Promise<void> => {
  await leadershipDetectionWorker.enqueue({});
  setTimeout(schedule, 1000);
}

schedule();
