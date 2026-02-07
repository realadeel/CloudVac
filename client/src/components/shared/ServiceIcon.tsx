import {
  Server, Database, Globe, HardDrive, ArrowUpDown, MapPin, Zap, Archive, Layers,
  Table2, Network, Activity, Bell, MessageSquare, Webhook,
} from 'lucide-react';
import { cn } from '../../lib/cn';

const iconMap: Record<string, { icon: typeof Server; color: string }> = {
  ec2: { icon: Server, color: 'text-ec2' },
  rds: { icon: Database, color: 'text-rds' },
  elb: { icon: Globe, color: 'text-elb' },
  ebs: { icon: HardDrive, color: 'text-ebs' },
  nat: { icon: ArrowUpDown, color: 'text-nat' },
  eip: { icon: MapPin, color: 'text-eip' },
  lambda: { icon: Zap, color: 'text-lambda' },
  s3: { icon: Archive, color: 'text-s3' },
  cloudformation: { icon: Layers, color: 'text-cloudformation' },
  dynamodb: { icon: Table2, color: 'text-dynamodb' },
  vpc: { icon: Network, color: 'text-vpc' },
  cloudwatch: { icon: Activity, color: 'text-cloudwatch' },
  sns: { icon: Bell, color: 'text-sns' },
  sqs: { icon: MessageSquare, color: 'text-sqs' },
  apigateway: { icon: Webhook, color: 'text-apigateway' },
};

export function ServiceIcon({ service, size = 16, className }: { service: string; size?: number; className?: string }) {
  const entry = iconMap[service] ?? { icon: Server, color: 'text-text-muted' };
  const Icon = entry.icon;
  return <Icon size={size} className={cn(entry.color, className)} />;
}
