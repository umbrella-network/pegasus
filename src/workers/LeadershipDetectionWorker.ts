import Bull from 'bull';
import { injectable } from 'inversify';
import Worker from './Worker';

@injectable()
class LeadershipDetectionWorker extends Worker {
  apply = async (job: Bull.Job): Promise<void> => {
    console.log('===============');
    console.log(job.data);
    console.log(new Date());
    console.log('===============');
  }
}

export default LeadershipDetectionWorker;
