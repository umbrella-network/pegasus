import 'reflect-metadata';
import {credentials} from '@grpc/grpc-js';
import {ConcordiumGRPCNodeClient} from '@concordium/web-sdk/nodejs';

it.skip('[concordium] health.Check', async () => {
  const creds = credentials.createInsecure();

  // const client = new ConcordiumGRPCNodeClient('grpc.mainnet.concordium.software', 20000, creds);
  const client = new ConcordiumGRPCNodeClient('3.79.149.146', 20000, creds);
  // const client = new ConcordiumGRPCNodeClient('node.testnet.concordium.com', 20000, creds);
  // const client = new ConcordiumGRPCNodeClient('concordium.prod.umb.network', 20000, creds);

  console.log(client.healthClient);
  console.log(await client.healthClient.check({}));
});
