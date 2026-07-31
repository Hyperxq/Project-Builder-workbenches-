import { Test, TestingModule } from '@nestjs/testing';
import { AuthorService } from './author.service';
import { AuthorRepository } from './author.repository';
import { Author } from './entities/author.entity';

describe('AuthorService', () => {
  let service: AuthorService;

  const repo = {
    create: jest.fn(),
    findMany: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const sample: Author = {
    authorId: 1,
    fullName: 'fullName-1',
    email: 'user1@example.com',
    country: 'country-1',
    active: true,
  };

  const keyQuery = { authorId: 1 };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthorService, { provide: AuthorRepository, useValue: repo }],
    }).compile();

    service = module.get(AuthorService);
  });

  it('create delegates to the repository', async () => {
    repo.create.mockResolvedValue(sample);

    await expect(service.create(sample)).resolves.toEqual(sample);
    expect(repo.create).toHaveBeenCalledWith(sample);
  });

  it('findAll delegates to the repository', async () => {
    repo.findMany.mockResolvedValue([sample]);

    await expect(service.findAll()).resolves.toEqual([sample]);
    expect(repo.findMany).toHaveBeenCalledWith({});
  });

  it('findOne delegates to the repository', async () => {
    repo.findOne.mockResolvedValue(sample);

    await expect(service.findOne(keyQuery)).resolves.toEqual(sample);
    expect(repo.findOne).toHaveBeenCalledWith(keyQuery);
  });

  it('update delegates to the repository without upsert', async () => {
    repo.update.mockResolvedValue(sample);
    const payload = { fullName: 'fullName-2' };

    await expect(service.update({ query: keyQuery, payload })).resolves.toEqual(
      sample,
    );
    expect(repo.update).toHaveBeenCalledWith(keyQuery, payload, {
      upsert: false,
    });
  });

  it('remove delegates to the repository', async () => {
    repo.remove.mockResolvedValue(sample);

    await expect(service.remove(keyQuery)).resolves.toEqual(sample);
    expect(repo.remove).toHaveBeenCalledWith(keyQuery);
  });
});
