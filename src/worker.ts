import './boot';
import Application from './lib/Application';
import LeadershipDetectionWorker from './workers/LeadershipDetectionWorker';

Application.get(LeadershipDetectionWorker).start()
