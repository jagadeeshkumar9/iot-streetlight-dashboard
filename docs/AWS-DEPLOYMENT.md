# AWS Deployment Guide

## Architecture Overview

```
┌─────────────────┐
│  Route 53 (DNS) │
└────────┬────────┘
         │
    ┌────▼─────┐
    │   ALB    │
    └────┬─────┘
         │
    ┌────▼──────────────────┐
    │   ECS Cluster         │
    ├───────────────────────┤
    │ - Backend API         │
    │ - MQTT Bridge         │
    │ - Frontend (S3+CF)    │
    └──────────┬────────────┘
               │
    ┌──────────▼──────────┐
    │  Supabase (RDS)     │
    │  - PostgreSQL       │
    │  - Auth             │
    │  - Realtime         │
    └─────────────────────┘
```

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Docker images built and pushed to ECR
- Domain name (optional, for DNS)
- SSL Certificate (AWS Certificate Manager)

## Step 1: Create ECR Repository

```bash
# Create ECR repositories
aws ecr create-repository --repository-name iot-backend --region ap-south-1
aws ecr create-repository --repository-name iot-mqtt-bridge --region ap-south-1
aws ecr create-repository --repository-name iot-frontend --region ap-south-1

# Get login token and push images
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com

docker build -t iot-backend ./backend
docker tag iot-backend:latest <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/iot-backend:latest
docker push <ACCOUNT_ID>.dkr.ecr.ap-south-1.amazonaws.com/iot-backend:latest

# Repeat for mqtt-bridge and frontend
```

## Step 2: Create VPC and Security Groups

```bash
# Create VPC
VPC_ID=$(aws ec2 create-vpc --cidr-block 10.0.0.0/16 --query 'Vpc.VpcId' --output text)

# Create Subnets
SUBNET_1=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.1.0/24 --availability-zone ap-south-1a --query 'Subnet.SubnetId' --output text)
SUBNET_2=$(aws ec2 create-subnet --vpc-id $VPC_ID --cidr-block 10.0.2.0/24 --availability-zone ap-south-1b --query 'Subnet.SubnetId' --output text)

# Create Security Group
SG_ID=$(aws ec2 create-security-group --group-name iot-sg --description 'IoT App SG' --vpc-id $VPC_ID --query 'GroupId' --output text)

# Add ingress rules
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 80 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 443 --cidr 0.0.0.0/0
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 5000 --cidr 10.0.0.0/16
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 3001 --cidr 10.0.0.0/16
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 1883 --cidr 0.0.0.0/0
```

## Step 3: Create ECS Cluster

```bash
# Create ECS cluster
aws ecs create-cluster --cluster-name iot-cluster --region ap-south-1

# Create Task Execution Role
aws iam create-role --role-name ecsTaskExecutionRole --assume-role-policy-document file://trust-policy.json
aws iam attach-role-policy --role-name ecsTaskExecutionRole --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

## Step 4: Create Task Definitions

```bash
# Backend API Task Definition
aws ecs register-task-definition --cli-input-json file://backend-task-def.json

# MQTT Bridge Task Definition
aws ecs register-task-definition --cli-input-json file://mqtt-bridge-task-def.json
```

### backend-task-def.json

```json
{
  "family": "iot-backend-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "backend-api",
      "image": "ACCOUNT_ID.dkr.ecr.ap-south-1.amazonaws.com/iot-backend:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "MQTT_BROKER",
          "value": "mqtt://mqtt-bridge:1883"
        }
      ],
      "secrets": [
        {
          "name": "SUPABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:iot/supabase-url"
        },
        {
          "name": "SUPABASE_KEY",
          "valueFrom": "arn:aws:secretsmanager:ap-south-1:ACCOUNT_ID:secret:iot/supabase-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/iot-backend",
          "awslogs-region": "ap-south-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

## Step 5: Create Services

```bash
# Create Backend Service
aws ecs create-service \
  --cluster iot-cluster \
  --service-name iot-backend-service \
  --task-definition iot-backend-api \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx,subnet-yyyyy],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --load-balancers targetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:ACCOUNT_ID:targetgroup/iot-backend/xxxxx,containerName=backend-api,containerPort=5000
```

## Step 6: Create Application Load Balancer

```bash
# Create ALB
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name iot-alb \
  --subnets subnet-xxxxx subnet-yyyyy \
  --security-groups sg-xxxxx \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Create Target Groups
aws elbv2 create-target-group \
  --name iot-backend-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-xxxxx \
  --target-type ip

# Create Listeners
aws elbv2 create-listener \
  --load-balancer-arn $ALB_ARN \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:ap-south-1:ACCOUNT_ID:targetgroup/iot-backend-tg/xxxxx
```

## Step 7: S3 + CloudFront for Frontend

```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket iot-dashboard-frontend \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1

# Upload frontend build
aws s3 sync ./frontend/build s3://iot-dashboard-frontend/

# Create CloudFront distribution
aws cloudfront create-distribution --distribution-config file://cloudfront-config.json
```

## Step 8: Monitoring & Logging

```bash
# Create CloudWatch Log Groups
aws logs create-log-group --log-group-name /ecs/iot-backend
aws logs create-log-group --log-group-name /ecs/iot-mqtt-bridge

# Create Alarms
aws cloudwatch put-metric-alarm \
  --alarm-name iot-backend-cpu-high \
  --alarm-description "Alert when CPU exceeds 80%" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold
```

## Cost Optimization

1. **Use Fargate Spot** for non-critical workloads (up to 70% savings)
2. **Enable Auto Scaling** based on CPU/Memory metrics
3. **Use Reserved Capacity** for predictable workloads
4. **Optimize container sizes** - use minimal base images
5. **Enable S3 Intelligent-Tiering** for data archival

## Estimated Monthly Costs (ap-south-1)

- ECS Fargate: ~$50-100 (2 tasks × 256 CPU × 512 GB mem)
- ALB: ~$25
- CloudFront: ~$10-30 (depends on traffic)
- Supabase: ~$25-50 (starter plan)
- **Total: ~$110-205/month**

## Production Checklist

- [ ] Enable SSL/TLS with ACM Certificate
- [ ] Configure WAF (Web Application Firewall)
- [ ] Set up VPN or bastion host
- [ ] Enable CloudTrail for audit logs
- [ ] Configure backup strategy for RDS
- [ ] Set up monitoring dashboards
- [ ] Enable auto-scaling policies
- [ ] Configure DNS failover
- [ ] Set up CI/CD pipeline (CodePipeline)
- [ ] Enable encryption at rest and in transit
