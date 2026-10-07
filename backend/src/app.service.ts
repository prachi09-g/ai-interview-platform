import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getWelcome() {
    return {
      name: 'AI Interview Preparation & Evaluation Platform API',
      version: '1.0.0',
      status: 'running',
      docs: '/api/docs',
    };
  }
}
