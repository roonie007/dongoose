import { d, Dongoose } from '../mod.ts';

const db = await Deno.openKv();

const users = Dongoose({
  username: d.string(),
  password: d.string().min(8).max(32),
  email: d.string().email(),

  firstname: d.string().optional(),
  lastname: d.string().optional(),
}, {
  db,
  name: 'users',
  indexes: ['email', 'username'],
});

await users.create({
  email: 'aze@aze.com',
  username: 'aze',
  password: 'aze',
});

const user = await users.findOne({ email: 'aze@aze.com' });
const _sameUserWithId = await users.findById(user!.id);

await users.updateById(user!.id, { firstname: 'John' });
await users.updateOne({ id: user!.id }, { lastname: 'Doe' });

await users.deleteById(user!.id);
await users.deleteOne({ email: user!.email });
