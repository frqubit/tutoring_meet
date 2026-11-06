import { WEBSITE_URI } from '@/src/config';
import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Environ } from '@/src/utils/meet_utils';

interface ClientData {
  socket: Socket;
  last_edit_unix: number | null;
  last_tick_unix: number | null;
  position: [number, number] | null;
}

@WebSocketGateway({
  cors: {
    origin: WEBSITE_URI,
  },
})
export class MeetGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('MeetGateway');
  private clients: Record<string, ClientData> = {};
  private environ: Environ | null = null;

  @SubscribeMessage('scroll')
  handleScroll(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ): void {
    Logger.log(`scroll: ${client.id}`);
    const split = message.split(';');
    const x = +split[0];
    const y = +split[1];

    this.clients[client.id].position = [x, y];
  }

  @SubscribeMessage('edit')
  handleEdit(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ): void {
    // if (this.environ == message) return; // just a re-sent update

    const new_environ = Environ.fromString(message, client.id);

    if (this.environ && new_environ.elements_equal(this.environ)) return;

    if (this.environ) {
      this.environ.update(new_environ);
    } else {
      this.environ = new_environ;
    }
  }

  @SubscribeMessage('tick')
  handleTick(
    @MessageBody() message: string,
    @ConnectedSocket() client: Socket,
  ): void {
    const timestamp = Date.now();
    const last_ticked = this.clients[client.id].last_tick_unix;

    if (
      this.environ &&
      this.environ.owner !== client.id &&
      (!last_ticked || last_ticked < timestamp)
    ) {
      // Logger.log(`tick: ${client.id}`);
      this.clients[client.id].last_tick_unix = timestamp;

      // Update position before sending
      const position = this.clients[this.environ.owner]?.position || undefined;

      this.server
        .to(client.id)
        .emit('environ', this.environ.serialize(position));
    }
  }

  afterInit(_server: any) {
    this.logger.log('Init');
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.clients[client.id] = {
      socket: client,
      last_edit_unix: null,
      last_tick_unix: null,
      position: null,
    };

    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    delete this.clients[client.id];
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
