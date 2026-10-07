import { Injectable, Logger } from '@nestjs/common';
import { Difficulty, Question, QuestionType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

interface BuiltInQuestion {
  questionText: string;
  modelAnswer: string;
  keywords: string[];
}

/*
 * Built-in fallback question bank.
 *
 * PostgreSQL questions are used first.
 * These questions fill any remaining slots.
 *
 * Questions are NEVER repeated inside the same interview.
 */
const BUILT_IN_QUESTIONS: Record<QuestionType, BuiltInQuestion[]> = {
  TECHNICAL: [
    {
      questionText: 'What is the difference between SQL and NoSQL databases?',
      modelAnswer:
        'SQL databases use relational tables and structured schemas, while NoSQL databases provide flexible data models and are often designed for horizontal scalability.',
      keywords: ['SQL', 'NoSQL', 'schema', 'database', 'scalability'],
    },
    {
      questionText: 'Explain authentication and authorization.',
      modelAnswer:
        'Authentication verifies the identity of a user, while authorization determines what resources and actions the authenticated user is permitted to access.',
      keywords: ['authentication', 'authorization', 'identity', 'permissions'],
    },
    {
      questionText: 'How does JWT authentication work?',
      modelAnswer:
        'After successful login the server creates a signed JWT containing user claims. The client sends the token with protected requests and the server verifies its signature and expiration.',
      keywords: ['JWT', 'token', 'signature', 'authentication', 'expiration'],
    },
    {
      questionText: 'What is database indexing and why is it useful?',
      modelAnswer:
        'A database index allows records to be located more efficiently without scanning the entire table. It improves read performance but adds storage and write overhead.',
      keywords: ['index', 'database', 'query', 'performance'],
    },
    {
      questionText: 'Explain the ACID properties of a database transaction.',
      modelAnswer:
        'ACID stands for Atomicity, Consistency, Isolation and Durability. These properties help ensure that database transactions remain reliable.',
      keywords: ['ACID', 'atomicity', 'consistency', 'isolation', 'durability'],
    },
    {
      questionText: 'What is caching and why is Redis commonly used for it?',
      modelAnswer:
        'Caching stores frequently accessed data in faster storage. Redis is an in-memory data store that can reduce database queries and improve application response time.',
      keywords: ['cache', 'Redis', 'memory', 'performance', 'database'],
    },
    {
      questionText: 'What is the difference between synchronous and asynchronous programming?',
      modelAnswer:
        'Synchronous code generally waits for an operation to finish before continuing, while asynchronous code allows other work to continue while waiting for operations such as network or file I/O.',
      keywords: ['synchronous', 'asynchronous', 'I/O', 'concurrency'],
    },
    {
      questionText: 'What is a REST API?',
      modelAnswer:
        'A REST API exposes resources through HTTP endpoints and commonly uses methods such as GET, POST, PUT, PATCH and DELETE. REST APIs are generally stateless.',
      keywords: ['REST', 'API', 'HTTP', 'resource', 'stateless'],
    },
    {
      questionText: 'Explain the difference between GET, POST, PUT, PATCH and DELETE.',
      modelAnswer:
        'GET retrieves data, POST commonly creates resources, PUT replaces a resource, PATCH partially updates it and DELETE removes it.',
      keywords: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
    {
      questionText: 'What is load balancing?',
      modelAnswer:
        'Load balancing distributes incoming requests across multiple servers to improve scalability, availability and fault tolerance.',
      keywords: ['load balancing', 'server', 'scalability', 'availability'],
    },
    {
      questionText: 'What is the difference between horizontal and vertical scaling?',
      modelAnswer:
        'Vertical scaling increases resources on a single machine, while horizontal scaling adds additional machines or application instances.',
      keywords: ['horizontal scaling', 'vertical scaling', 'server', 'scalability'],
    },
    {
      questionText: 'What is a message queue and when would you use one?',
      modelAnswer:
        'A message queue allows work to be processed asynchronously. It is useful for background jobs, notifications, file processing and communication between services.',
      keywords: ['queue', 'producer', 'consumer', 'asynchronous', 'background job'],
    },
    {
      questionText: 'What is the difference between a process and a thread?',
      modelAnswer:
        'A process has its own memory space, while threads are execution units inside a process and normally share memory and resources.',
      keywords: ['process', 'thread', 'memory', 'concurrency'],
    },
    {
      questionText: 'What is database normalization?',
      modelAnswer:
        'Normalization organizes relational database tables to reduce redundant data and improve data integrity by separating data into appropriately related tables.',
      keywords: ['normalization', 'database', 'redundancy', 'integrity'],
    },
    {
      questionText: 'What is a database transaction?',
      modelAnswer:
        'A database transaction is a group of operations treated as one logical unit of work that either completes successfully or is rolled back when necessary.',
      keywords: ['transaction', 'database', 'commit', 'rollback'],
    },
    {
      questionText: 'What is Docker and why is it useful?',
      modelAnswer:
        'Docker packages applications and dependencies into containers, providing consistent environments across development, testing and deployment.',
      keywords: ['Docker', 'container', 'deployment', 'dependencies'],
    },
    {
      questionText: 'What is the difference between containers and virtual machines?',
      modelAnswer:
        'Virtual machines include complete guest operating systems, while containers generally share the host operating system kernel and are therefore lighter and faster to start.',
      keywords: ['container', 'virtual machine', 'Docker', 'kernel'],
    },
    {
      questionText: 'What is the difference between monolithic and microservices architecture?',
      modelAnswer:
        'A monolithic application is deployed as one main application, while microservices divide functionality into smaller independently deployable services.',
      keywords: ['monolith', 'microservices', 'services', 'deployment'],
    },
    {
      questionText: 'How would you improve the performance of a slow API?',
      modelAnswer:
        'First identify the bottleneck using profiling and monitoring. Possible improvements include database optimization, indexing, caching, pagination and asynchronous background processing.',
      keywords: ['performance', 'profiling', 'indexing', 'caching', 'pagination'],
    },
    {
      questionText: 'How would you secure a REST API?',
      modelAnswer:
        'Use HTTPS, authentication, authorization, input validation, secure token management, rate limiting and careful handling of sensitive information.',
      keywords: ['HTTPS', 'authentication', 'authorization', 'validation', 'security'],
    },
    {
      questionText: 'What is pagination and why is it useful?',
      modelAnswer:
        'Pagination divides a large result set into smaller pages. It reduces response size, memory usage and database workload.',
      keywords: ['pagination', 'database', 'API', 'performance'],
    },
    {
      questionText: 'What is connection pooling?',
      modelAnswer:
        'Connection pooling maintains reusable database connections instead of opening a new connection for every request, reducing connection overhead.',
      keywords: ['connection pool', 'database', 'performance', 'connection'],
    },
    {
      questionText: 'What is dependency injection?',
      modelAnswer:
        'Dependency injection provides an object with its dependencies from outside rather than having the object create them itself. It improves modularity and testability.',
      keywords: ['dependency injection', 'dependency', 'testing', 'modularity'],
    },
    {
      questionText: 'What is middleware in a web application?',
      modelAnswer:
        'Middleware executes between an incoming request and the final request handler. It can perform authentication, logging, validation and other shared processing.',
      keywords: ['middleware', 'request', 'authentication', 'logging'],
    },
    {
      questionText: 'What is the purpose of HTTP status codes?',
      modelAnswer:
        'HTTP status codes communicate the result of an HTTP request. For example, 200 indicates success, 400 a client error, 401 authentication failure and 500 a server error.',
      keywords: ['HTTP', 'status code', '200', '400', '500'],
    },
    {
      questionText: 'What is the difference between TCP and UDP?',
      modelAnswer:
        'TCP provides reliable ordered delivery using a connection, while UDP has lower overhead but does not guarantee delivery or ordering.',
      keywords: ['TCP', 'UDP', 'network', 'reliability'],
    },
    {
      questionText: 'What is an event loop?',
      modelAnswer:
        'An event loop coordinates asynchronous operations by processing queued callbacks or tasks when the execution stack becomes available.',
      keywords: ['event loop', 'asynchronous', 'callback', 'queue'],
    },
    {
      questionText: 'What is a race condition?',
      modelAnswer:
        'A race condition occurs when multiple operations access shared state concurrently and the final result depends on their execution timing.',
      keywords: ['race condition', 'concurrency', 'shared state', 'synchronization'],
    },
    {
      questionText: 'What is the difference between encryption and hashing?',
      modelAnswer:
        'Encryption is reversible with the correct key, while cryptographic hashing is designed to be one-way and produces a fixed-size digest.',
      keywords: ['encryption', 'hashing', 'key', 'security'],
    },
    {
      questionText: 'What is rate limiting in an API?',
      modelAnswer:
        'Rate limiting restricts how many requests a client can make within a period of time. It helps prevent abuse and protects system resources.',
      keywords: ['rate limiting', 'API', 'requests', 'security'],
    },
  ],

  HR: [
    {
      questionText: 'Tell me about yourself.',
      modelAnswer:
        'A strong answer briefly covers relevant education or experience, important skills and accomplishments, and how they connect to the position.',
      keywords: ['experience', 'skills', 'career', 'role'],
    },
    {
      questionText: 'Why do you want to work at this company?',
      modelAnswer:
        'A strong answer connects knowledge about the company and position with the candidate’s skills, interests and career goals.',
      keywords: ['company', 'motivation', 'career', 'role'],
    },
    {
      questionText: 'Why should we hire you?',
      modelAnswer:
        'The candidate should explain their relevant strengths, experience and the specific value they can bring to the position.',
      keywords: ['skills', 'experience', 'value', 'strengths'],
    },
    {
      questionText: 'What are your greatest strengths?',
      modelAnswer:
        'A strong answer identifies relevant strengths and supports them with examples showing how those strengths produced useful results.',
      keywords: ['strengths', 'example', 'results'],
    },
    {
      questionText: 'What is one weakness you are working to improve?',
      modelAnswer:
        'A good answer identifies a genuine manageable weakness and explains concrete actions being taken to improve it.',
      keywords: ['weakness', 'improvement', 'self-awareness'],
    },
    {
      questionText: 'Where do you see yourself in five years?',
      modelAnswer:
        'A strong answer demonstrates realistic professional growth, continuous learning and career goals that can align with the position.',
      keywords: ['career', 'growth', 'learning', 'goals'],
    },
    {
      questionText: 'What motivates you at work?',
      modelAnswer:
        'A strong answer discusses genuine professional motivators such as learning, solving meaningful problems, creating impact or collaborating with others.',
      keywords: ['motivation', 'learning', 'impact', 'teamwork'],
    },
    {
      questionText: 'Why are you interested in this role?',
      modelAnswer:
        'The answer should connect the responsibilities of the role with the candidate’s skills, interests and career direction.',
      keywords: ['role', 'skills', 'interest', 'career'],
    },
    {
      questionText: 'How do you handle pressure?',
      modelAnswer:
        'A strong answer discusses prioritization, organization, communication and maintaining focus during stressful situations.',
      keywords: ['pressure', 'prioritization', 'communication', 'organization'],
    },
    {
      questionText: 'How do you prioritize multiple tasks?',
      modelAnswer:
        'Tasks can be prioritized based on urgency, importance, dependencies and deadlines while communicating conflicts to relevant stakeholders.',
      keywords: ['prioritization', 'deadline', 'planning', 'communication'],
    },
    {
      questionText: 'What type of work environment do you prefer?',
      modelAnswer:
        'A good answer describes an environment that supports productivity and collaboration while demonstrating adaptability.',
      keywords: ['environment', 'productivity', 'collaboration', 'adaptability'],
    },
    {
      questionText: 'What are your salary expectations?',
      modelAnswer:
        'A professional answer considers the market range, responsibilities and total compensation while showing reasonable flexibility.',
      keywords: ['salary', 'market', 'compensation', 'flexibility'],
    },
    {
      questionText: 'What are your short-term career goals?',
      modelAnswer:
        'A strong answer identifies realistic near-term goals involving skill development, responsibility and contribution to the organization.',
      keywords: ['goals', 'career', 'skills', 'growth'],
    },
    {
      questionText: 'What are your long-term career goals?',
      modelAnswer:
        'A good answer demonstrates ambition while showing a realistic path of continuous learning, increased responsibility and professional development.',
      keywords: ['career', 'goals', 'growth', 'development'],
    },
    {
      questionText: 'How do you keep yourself motivated during repetitive work?',
      modelAnswer:
        'A strong answer may discuss setting smaller goals, focusing on the purpose of the work, measuring progress and maintaining consistent habits.',
      keywords: ['motivation', 'goals', 'progress', 'discipline'],
    },
    {
      questionText: 'What do you expect from your manager?',
      modelAnswer:
        'A balanced answer may mention clear expectations, constructive feedback, communication and appropriate support while showing personal ownership.',
      keywords: ['manager', 'feedback', 'communication', 'ownership'],
    },
    {
      questionText: 'How do you respond to constructive criticism?',
      modelAnswer:
        'A strong answer demonstrates openness, careful listening, asking clarifying questions and applying useful feedback to improve performance.',
      keywords: ['feedback', 'criticism', 'learning', 'improvement'],
    },
    {
      questionText: 'What does success mean to you?',
      modelAnswer:
        'A thoughtful answer connects success with achieving meaningful goals, continuous development and creating value rather than only external rewards.',
      keywords: ['success', 'goals', 'growth', 'value'],
    },
    {
      questionText: 'How do you maintain a good work-life balance?',
      modelAnswer:
        'A good answer discusses planning, prioritization, boundaries and healthy habits while still demonstrating reliability at work.',
      keywords: ['balance', 'planning', 'prioritization', 'reliability'],
    },
    {
      questionText: 'Do you prefer working independently or in a team?',
      modelAnswer:
        'A strong answer demonstrates the ability to work independently while also collaborating effectively when a task benefits from teamwork.',
      keywords: ['independent', 'teamwork', 'collaboration', 'adaptability'],
    },
  ],

  BEHAVIORAL: [
    {
      questionText: 'Tell me about a time you disagreed with a teammate.',
      modelAnswer:
        'Use the STAR method to explain the disagreement, how you communicated constructively, the resolution and what you learned.',
      keywords: ['STAR', 'conflict', 'teamwork', 'communication'],
    },
    {
      questionText: 'Describe a project where you had to meet a tight deadline.',
      modelAnswer:
        'Explain the situation, how you prioritized work, the actions you took and the final result.',
      keywords: ['STAR', 'deadline', 'prioritization', 'result'],
    },
    {
      questionText: 'Tell me about a difficult problem you solved.',
      modelAnswer:
        'Describe the problem, your responsibility, your reasoning and actions, and the measurable outcome.',
      keywords: ['problem solving', 'STAR', 'action', 'result'],
    },
    {
      questionText: 'Tell me about a mistake you made and how you handled it.',
      modelAnswer:
        'Take responsibility for the mistake, explain how you corrected it and describe what you learned to prevent it from recurring.',
      keywords: ['mistake', 'responsibility', 'learning', 'improvement'],
    },
    {
      questionText: 'Describe a situation where you demonstrated leadership.',
      modelAnswer:
        'Explain how you took responsibility, influenced others, made decisions or removed obstacles and what result was achieved.',
      keywords: ['leadership', 'initiative', 'team', 'result'],
    },
    {
      questionText: 'Tell me about a time you received difficult feedback.',
      modelAnswer:
        'Explain how you listened to the feedback, evaluated it objectively and used it to improve your performance.',
      keywords: ['feedback', 'learning', 'improvement'],
    },
    {
      questionText: 'Describe a time when you had to learn something quickly.',
      modelAnswer:
        'Describe why rapid learning was necessary, how you approached learning and how you successfully applied the new knowledge.',
      keywords: ['learning', 'adaptability', 'initiative', 'result'],
    },
    {
      questionText: 'Tell me about a successful team project.',
      modelAnswer:
        'Explain the shared objective, your contribution, how you collaborated with others and the final outcome.',
      keywords: ['teamwork', 'collaboration', 'contribution', 'result'],
    },
    {
      questionText: 'Describe a time when your first solution did not work.',
      modelAnswer:
        'Explain how you identified that the approach was unsuccessful, evaluated alternatives and adapted your solution.',
      keywords: ['adaptability', 'problem solving', 'learning'],
    },
    {
      questionText: 'Tell me about a time you took initiative.',
      modelAnswer:
        'Describe an opportunity or problem you noticed, why you acted without being asked and what result your action produced.',
      keywords: ['initiative', 'ownership', 'action', 'result'],
    },
    {
      questionText: 'Describe a time you had to explain a complex idea.',
      modelAnswer:
        'Explain how you adapted your communication to the audience, simplified the information and confirmed understanding.',
      keywords: ['communication', 'clarity', 'audience', 'complexity'],
    },
    {
      questionText: 'Tell me about a goal you set and achieved.',
      modelAnswer:
        'Describe the goal, your plan, actions, obstacles and the measurable result.',
      keywords: ['goal', 'planning', 'action', 'result'],
    },
    {
      questionText: 'Tell me about a time you had to manage competing priorities.',
      modelAnswer:
        'Explain how you evaluated urgency and importance, organized your work and communicated expectations to stakeholders.',
      keywords: ['priorities', 'planning', 'communication', 'time management'],
    },
    {
      questionText: 'Describe a time you helped a teammate.',
      modelAnswer:
        'Explain the teammate’s challenge, the support you provided and how your contribution helped the team achieve its objective.',
      keywords: ['teamwork', 'support', 'collaboration', 'result'],
    },
    {
      questionText: 'Tell me about a time you failed to meet an expectation.',
      modelAnswer:
        'Explain what happened honestly, take responsibility, describe how you responded and explain what you changed afterward.',
      keywords: ['failure', 'responsibility', 'learning', 'improvement'],
    },
    {
      questionText: 'Describe a time you had to adapt to a major change.',
      modelAnswer:
        'Explain the change, how it affected your work, the actions you took to adapt and the resulting outcome.',
      keywords: ['adaptability', 'change', 'learning', 'result'],
    },
    {
      questionText: 'Tell me about a time you worked with a difficult person.',
      modelAnswer:
        'Focus on professional communication, understanding different perspectives and finding a productive way to work toward the shared objective.',
      keywords: ['communication', 'conflict', 'teamwork', 'professionalism'],
    },
    {
      questionText: 'Describe a decision you made with incomplete information.',
      modelAnswer:
        'Explain what information was available, how you evaluated risk, why you chose your approach and what happened afterward.',
      keywords: ['decision making', 'risk', 'analysis', 'result'],
    },
    {
      questionText: 'Tell me about a time you improved an existing process.',
      modelAnswer:
        'Describe the original problem, the improvement you proposed or implemented and the measurable impact it created.',
      keywords: ['improvement', 'initiative', 'process', 'impact'],
    },
    {
      questionText: 'Describe a situation where you had to persuade someone.',
      modelAnswer:
        'Explain the different viewpoints, how you presented evidence or reasoning and how you reached an agreement or useful outcome.',
      keywords: ['persuasion', 'communication', 'reasoning', 'outcome'],
    },
  ],
};

@Injectable()
export class QuestionGeneratorService {
  private readonly logger =
    new Logger(QuestionGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async getQuestionsForInterview(
    userId: string,
    categoryId: string,
    type: QuestionType,
    difficulty: Difficulty,
    count: number,
  ): Promise<Question[]> {
    /*
     * Get database questions matching the interview.
     */
    const databaseQuestions =
      await this.prisma.question.findMany({
        where: {
          categoryId,
          type,
          difficulty,
        },
      });

    /*
     * Remove duplicate database questions.
     */
    const uniqueDatabaseQuestions =
      this.uniqueQuestions(databaseQuestions);

    /*
     * Randomize DB questions.
     */
    const shuffledDatabase =
      this.shuffle(uniqueDatabaseQuestions);

    const selected: Question[] = [];
    const selectedTexts = new Set<string>();

    /*
     * Add database questions first.
     */
    for (const question of shuffledDatabase) {
      const normalized =
        this.normalize(question.questionText);

      if (selectedTexts.has(normalized)) {
        continue;
      }

      selectedTexts.add(normalized);
      selected.push(question);

      if (selected.length >= count) {
        return selected;
      }
    }

    /*
     * Not enough DB questions.
     *
     * Fill the remaining slots from the built-in question bank.
     */
    const builtInPool =
      this.shuffle(BUILT_IN_QUESTIONS[type] ?? []);

    for (const draft of builtInPool) {
      if (selected.length >= count) {
        break;
      }

      const normalized =
        this.normalize(draft.questionText);

      /*
       * Critical duplicate protection.
       */
      if (selectedTexts.has(normalized)) {
        continue;
      }

      /*
       * Check if this built-in question already exists.
       * Reuse it rather than creating duplicate database rows.
       */
      let question =
        await this.prisma.question.findFirst({
          where: {
            categoryId,
            type,
            difficulty,
            questionText: draft.questionText,
          },
        });

      if (!question) {
        question =
          await this.prisma.question.create({
            data: {
              categoryId,
              type,
              difficulty,
              questionText: draft.questionText,
              modelAnswer: draft.modelAnswer,
              keywords: draft.keywords,
            },
          });
      }

      selectedTexts.add(normalized);
      selected.push(question);
    }

    /*
     * This should normally only happen if someone asks for
     * more questions than exist in the entire built-in pool.
     */
    if (selected.length < count) {
      this.logger.warn(
        `Requested ${count} questions but only ${selected.length} unique ` +
          `questions are available for type=${type}.`,
      );
    }

    this.logger.log(
      `Prepared ${selected.length} unique ${type} questions for interview.`,
    );

    return selected;
  }

  private uniqueQuestions(
    questions: Question[],
  ): Question[] {
    const seen = new Set<string>();
    const result: Question[] = [];

    for (const question of questions) {
      const normalized =
        this.normalize(question.questionText);

      if (seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      result.push(question);
    }

    return result;
  }

  private normalize(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }

  private shuffle<T>(items: T[]): T[] {
    const result = [...items];

    for (
      let i = result.length - 1;
      i > 0;
      i--
    ) {
      const j = Math.floor(
        Math.random() * (i + 1),
      );

      [result[i], result[j]] = [
        result[j],
        result[i],
      ];
    }

    return result;
  }
}