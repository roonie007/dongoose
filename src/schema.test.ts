import { afterAll, beforeAll, describe, it } from '$std/testing/bdd.ts';
import { assertEquals, assertExists } from '$std/testing/asserts.ts';
import { d, Dongoose } from '../mod.ts';

const schema = {
  email: d.string().email(),

  username: d.string(),
  password: d.string().min(8).max(32),

  firstname: d.string().optional(),
  lastname: d.string().optional(),

  activated: d.boolean().default(false),
};

const user1 = {
  email: 'john.doe@example.com',

  username: 'john.doe',
  password: 'azeazeaze',

  firstname: 'John',
  lastname: 'Doe',

  activated: false,
};

const getUserDongooseInstance = (db: Deno.Kv) =>
  Dongoose(schema, {
    db,
    name: 'users',
    indexes: ['email', 'username'],
  });

describe('schema', () => {
  let db: Deno.Kv;

  beforeAll(async () => {
    db = await Deno.openKv();
  });

  afterAll(() => {
    db.close();
  });

  describe('Dongoose', () => {
    it('should create a new user', async () => {
      const users = getUserDongooseInstance(db);

      await users.create(user1);
      const foundUser = await users.findOne({ email: user1.email });

      if (!foundUser) {
        throw new Error('User not found');
      }

      assertEquals(foundUser.email, user1.email);
      assertEquals(foundUser.username, user1.username);
      assertEquals(foundUser.password, user1.password);
      assertEquals(foundUser.firstname, user1.firstname);
      assertEquals(foundUser.lastname, user1.lastname);
      assertEquals(foundUser.activated, user1.activated);

      assertExists(foundUser.id);
      assertExists(foundUser.createdAt);
      assertExists(foundUser.updatedAt);
    });

    it('should find a user by id', async () => {
      const users = getUserDongooseInstance(db);

      const foundUser = await users.findOne({ username: user1.username });
      const foundUserWithId = await users.findById(foundUser!.id);

      if (!foundUserWithId) {
        throw new Error('User not found');
      }

      assertEquals(foundUserWithId.email, user1.email);
    });

    it('should update a user', async () => {
      const email = 'new-email@titi.com';

      const users = getUserDongooseInstance(db);

      await users.updateOne({ username: user1.username }, { email });
      const foundUser = await users.findOne({ username: user1.username });

      if (!foundUser) {
        throw new Error('User not found');
      }

      assertEquals(foundUser.email, email);
      assertEquals(foundUser.username, user1.username);
      assertEquals(foundUser.password, user1.password);
      assertEquals(foundUser.firstname, user1.firstname);
      assertEquals(foundUser.lastname, user1.lastname);
      assertEquals(foundUser.activated, user1.activated);

      assertExists(foundUser.id);
      assertExists(foundUser.createdAt);
      assertExists(foundUser.updatedAt);
    });

    it('should delete a user', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.deleteOne({ username: user1.username });
      assertEquals(result?.ok, true);

      const foundUser = await users.findOne({ username: user1.username });
      assertEquals(foundUser, null);
    });

    it('should delete a user with id', async () => {
      const users = getUserDongooseInstance(db);

      await users.create(user1);
      const foundUser = await users.findOne({ email: user1.email });

      if (!foundUser) {
        throw new Error('User not found');
      }

      const result = await users.deleteById(foundUser.id);
      assertEquals(result?.ok, true);
    });

    // #####################################################
    // # No user found
    // #####################################################
    it('should return null if user not found', async () => {
      const users = getUserDongooseInstance(db);

      const foundUser = await users.findOne({ email: 'non-existing-email@toto.com' });
      assertEquals(foundUser, null);
    });

    it('should return null if user not found by id', async () => {
      const users = getUserDongooseInstance(db);

      const foundUser = await users.findById('4429562d-1730-4805-bcfa-04e38a475851');
      assertEquals(foundUser, null);
    });

    it('should return null if user update not found by query', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.updateOne({ email: 'non-existing-email@toto.com' }, { firstname: 'John' });
      assertEquals(result, null);
    });

    it('should return null if user update not found by id', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.updateById('4429562d-1730-4805-bcfa-04e38a475851', { firstname: 'John' });
      assertEquals(result, null);
    });

    it('should return null if user delete not found by query', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.deleteOne({ email: 'non-existing-email@toto.com' });
      assertEquals(result, null);
    });

    it('should return null if user delete not found by id', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.deleteById('4429562d-1730-4805-bcfa-04e38a475851');
      assertEquals(result, null);
    });

    // #####################################################
    // # No keys in query
    // #####################################################
    it('should return null if find user query has no keys', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.findOne({});
      assertEquals(result, null);
    });

    it('should return null if update user query has no keys', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.updateOne({}, { email: 'test@test.com' });
      assertEquals(result, null);
    });

    it('should return null if delete user query has no keys', async () => {
      const users = getUserDongooseInstance(db);

      const result = await users.deleteOne({});
      assertEquals(result, null);
    });
  });
});
