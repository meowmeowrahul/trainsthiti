const bcrypt = require("bcryptjs");
const userController = require("../controllers/userController");

const createRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createReq = (body, userDb) => ({
  body,
  app: { locals: { userDb } },
});

describe("userController unit", () => {
  test("register hashes password before insert", async () => {
    const userDb = {
      findOne: jest.fn().mockResolvedValue(null),
      insertOne: jest.fn().mockResolvedValue({ insertedId: "u1" }),
    };
    const req = createReq(
      {
        username: "alice",
        email: "alice@example.com",
        password: "plainpass",
      },
      userDb,
    );
    const res = createRes();

    await userController.postUser(req, res);

    expect(userDb.insertOne).toHaveBeenCalledTimes(1);
    const inserted = userDb.insertOne.mock.calls[0][0];
    expect(inserted.password).not.toBe("plainpass");
    expect(await bcrypt.compare("plainpass", inserted.password)).toBe(true);
  });

  test("login rejects invalid password", async () => {
    const hashed = await bcrypt.hash("correctpass", 10);
    const userDb = {
      findOne: jest.fn().mockResolvedValue({
        username: "bob",
        password: hashed,
      }),
    };
    const req = createReq({ username: "bob", password: "wrongpass" }, userDb);
    const res = createRes();

    await userController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ staus: "Incorrect Password" });
  });

  test("getUser returns user payload by username", async () => {
    const userDb = {
      find: jest.fn().mockReturnValue({
        toArray: jest.fn().mockResolvedValue([{ username: "rhea" }]),
      }),
    };
    const req = createReq({ username: "rhea" }, userDb);
    const res = createRes();

    await userController.getUser(req, res);

    expect(userDb.find).toHaveBeenCalledWith({ username: "rhea" });
    expect(res.json).toHaveBeenCalledWith({
      status: "success",
      user: [{ username: "rhea" }],
    });
  });
});
