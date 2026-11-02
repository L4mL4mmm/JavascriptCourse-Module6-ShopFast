import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { OrderEventsGateway } from './order-events.gateway';
import { Order } from '../orders/entities/order.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order]),
    JwtModule,
    ConfigModule,
  ],
  providers: [OrderEventsGateway],
  exports: [OrderEventsGateway],
})
export class EventsModule {}
