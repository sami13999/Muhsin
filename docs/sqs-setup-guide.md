# AWS SQS Setup Guide for MUSHIN 2.0

## Overview

MUSHIN uses AWS SQS FIFO queues for event processing. This guide covers queue creation, configuration, and IAM setup.

## Prerequisites

- AWS account with SQS permissions
- AWS CLI configured with appropriate credentials
- Understanding of MUSHIN's queue architecture (ADR-031)

## Queue Architecture

Per ADR-031, MUSHIN uses 6 queues:

| Queue | Type | Purpose | Priority |
|-------|------|---------|----------|
| `mushin-outbox` | Standard | Outbox relay events | Medium |
| `mushin-dlq` | Standard | Dead letter queue | High |
| `mushin-discovery-high` | FIFO | Interactive discovery (user-waiting) | Highest |
| `mushin-discovery-standard` | FIFO | Bulk discovery fan-out | Medium |
| `mushin-rescore-low` | Standard | Scheduled re-scoring | Low |
| `mushin-erasure` | Standard | GDPR erasure (72-hour SLA) | High |

## Queue Creation

### Option A: AWS Console

1. Go to AWS Console → SQS → Create queue
2. For each queue:
   - Enter queue name
   - Select queue type (Standard or FIFO)
   - Configure visibility timeout (30 seconds recommended)
   - Configure message retention (4 days standard, 14 days for DLQ)
   - Enable dead letter queue (except for DLQ itself)

### Option B: AWS CLI

```bash
# Create standard queues
aws sqs create-queue --queue-name mushin-outbox \
  --attributes '{"VisibilityTimeout":"30","MessageRetentionPeriod":"345600"}'

aws sqs create-queue --queue-name mushin-dlq \
  --attributes '{"MessageRetentionPeriod":"1209600"}'

aws sqs create-queue --queue-name mushin-rescore-low \
  --attributes '{"VisibilityTimeout":"30","MessageRetentionPeriod":"345600"}'

aws sqs create-queue --queue-name mushin-erasure \
  --attributes '{"VisibilityTimeout":"60","MessageRetentionPeriod":"345600"}'

# Create FIFO queues
aws sqs create-queue --queue-name mushin-discovery-high.fifo \
  --attributes '{"FifoQueue":"true","ContentBasedDeduplication":"true","VisibilityTimeout":"60"}'

aws sqs create-queue --queue-name mushin-discovery-standard.fifo \
  --attributes '{"FifoQueue":"true","ContentBasedDeduplication":"true","VisibilityTimeout":"30"}'

# Configure DLQ on main queues
aws sqs set-queue-attributes --queue-url <OUTBOX_URL> \
  --attributes '{"RedrivePolicy":"{\"deadLetterTargetArn\":\"<DLQ_ARN>\",\"maxReceiveCount\":\"3\"}"}'
```

### Option C: Terraform (Recommended)

```hcl
# See infrastructure/ directory for full Terraform configuration
```

## Queue Configuration

### Visibility Timeout

| Queue | Recommended | Rationale |
|-------|-------------|-----------|
| outbox | 30s | Relay processes quickly |
| discovery-high | 60s | Discovery jobs take longer |
| discovery-standard | 30s | Bulk jobs have parallel workers |
| rescore-low | 30s | Scoring is quick |
| erasure | 60s | Erasure may take time |

### Message Retention

| Queue | Recommended | Rationale |
|-------|-------------|-----------|
| All queues | 4 days (345600s) | Standard retention |
| DLQ | 14 days (1209600s) | Need time to investigate |

### Dead Letter Queue

All main queues should have the DLQ configured:
- `maxReceiveCount`: 3 (message moves to DLQ after 3 failed attempts)

## IAM Setup

### Worker IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SQSWorkerAccess",
      "Effect": "Allow",
      "Action": [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-outbox",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-discovery-high.fifo",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-discovery-standard.fifo",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-rescore-low",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-erasure"
      ]
    },
    {
      "Sid": "SQSDLPublish",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-dlq"
      ]
    }
  ]
}
```

### Relay IAM Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SQSRelayPublish",
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage"
      ],
      "Resource": [
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-outbox",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-discovery-high.fifo",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-discovery-standard.fifo",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-rescore-low",
        "arn:aws:sqs:us-east-1:ACCOUNT_ID:mushin-erasure"
      ]
    }
  ]
}
```

## Environment Variables

After creating queues, set these in `.env`:

```bash
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
SQS_OUTBOX_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-outbox"
SQS_DLQ_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-dlq"
SQS_DISCOVERY_HIGH_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-discovery-high.fifo"
SQS_DISCOVERY_STANDARD_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-discovery-standard.fifo"
SQS_RESCORE_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-rescore-low"
SQS_ERASURE_QUEUE_URL="https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/mushin-erasure"
```

## Validation

Run the validation script to verify all queues are correctly configured:

```bash
npx tsx scripts/validate-sqs.ts
```

## Troubleshooting

### Queue not found
- Check queue name spelling
- Check AWS region matches
- Verify IAM permissions

### Messages not being processed
- Check worker is running
- Check queue URL in environment
- Check IAM permissions for ReceiveMessage

### Messages going to DLQ
- Check event handler code
- Check for serialization errors
- Review DLQ messages in AWS Console

## Monitoring

Set up CloudWatch alarms for:
- Queue depth > 1000 messages
- Oldest message age > 5 minutes
- DLQ depth > 0 (any message in DLQ is concerning)
