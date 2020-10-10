import './boot';
import Application from './lib/Application';
import LeadershipDetectionWorker from './workers/LeadershipDetectionWorker';
import settings from './config/settings';

const leadershipDetectionWorker: LeadershipDetectionWorker = Application.get(LeadershipDetectionWorker);

const schedule = async (): Promise<void> => {
  await leadershipDetectionWorker.enqueue({});
  setTimeout(schedule, settings.jobs.blockCreation.interval);
}

schedule();
