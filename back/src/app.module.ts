import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';

import { AppController } from './app.controller.js';
import { DbService } from './db.service.js';
import { MessagesResolver } from './messages.resolver.js';
import { ConfigModule } from '@nestjs/config';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';

const isProd = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      playground: false,
      introspection: !isProd,
      plugins: isProd ? [] : [ApolloServerPluginLandingPageLocalDefault()],
    })
  ],
  controllers: [AppController],
  providers: [DbService, MessagesResolver],
})
export class AppModule {}
