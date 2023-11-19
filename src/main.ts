import { App, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { FilterCriteria, FilterRule, StartingPosition } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';

export class MyStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps = {}) {
    super(scope, id, props);

    let table = new Table(this, 'table', {
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'cpf',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: "secundary",
      partitionKey: {
        name: "cpf",
        type: AttributeType.STRING
      },
      sortKey: {
        name: 'nome',
        type: AttributeType.STRING
      }
    });

    let insertFn = new NodejsFunction(this, 'insert-function', {
      handler: 'handler',
      entry: join(__dirname, 'lambda-fns/insert.ts'),
    });
    insertFn.addEventSource(new DynamoEventSource(table, {
      startingPosition: StartingPosition.TRIM_HORIZON,
      filters: [
        FilterCriteria.filter({
          eventName: FilterRule.isEqual('INSERT'),
        }),
      ],
    }));

    let updateFn = new NodejsFunction(this, 'update-function', {
      handler: 'handler',
      entry: join(__dirname, 'lambda-fns/update.ts'),
    });
    updateFn.addEventSource(new DynamoEventSource(table, {
      startingPosition: StartingPosition.TRIM_HORIZON,
      filters: [
        FilterCriteria.filter({
          eventName: FilterRule.isEqual('MODIFY'),
        }),
      ],
    }));

    let deleteFn = new NodejsFunction(this, 'delete-function', {
      handler: 'handler',
      entry: join(__dirname, 'lambda-fns/delete.ts'),
    });
    deleteFn.addEventSource(new DynamoEventSource(table, {
      startingPosition: StartingPosition.TRIM_HORIZON,
      filters: [
        FilterCriteria.filter({
          eventName: FilterRule.isEqual('REMOVE'),
        }),
      ],
    }));
  }
}

// for development, use account/region from cdk cli
const devEnv = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const app = new App();

new MyStack(app, 'dynamodb-playground-dev', { env: devEnv });
// new MyStack(app, 'dynamodb-playground-prod', { env: prodEnv });

app.synth();