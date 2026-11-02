import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiAgentService } from './ai-agent.service';
import { AiAgentController } from './ai-agent.controller';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { TicketsModule } from '../tickets/tickets.module';

@Module({
  imports: [
    ConfigModule,
    OrdersModule,
    ProductsModule,
    TicketsModule,
  ],
  controllers: [AiAgentController],
  providers: [AiAgentService],
  exports: [AiAgentService],
})
export class AiAgentModule {}
