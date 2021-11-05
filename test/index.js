/*global describe,it*/

const assert = require("assert");
const lib = require("../");
//const synchronize = require("node-windows-synchronize");


describe("CreateSharedMemory", function () {
  it("should create shared memory", function () {
    const handle = lib.createSharedMemory(
      "/TestSharedMemory",
      (lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR),
      4096
    );

    assert.ok(handle);

    lib.closeSharedMemory(handle);
  });
});

describe("OpenSharedMemory", function () {
  it("should create and open shared memory", function () {
    const cHandle = lib.createSharedMemory(
      "/TestSharedMemory",
      (lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR),
      4096
    );
    const oHandle = lib.openSharedMemory(
      "/TestSharedMemory",
      4096
    );

    assert.ok(cHandle);
    assert.ok(oHandle);

    lib.closeSharedMemory(oHandle);
    lib.closeSharedMemory(cHandle);
  });
});

describe("WriteSharedMemory", function () {
  it("should create and write into shared memory", function () {
    const handle = lib.createSharedMemory(
      "/TestSharedMemory",
      (lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR),
      4096
    );

    lib.writeSharedData(handle, "hello world!!");

    assert.ok(handle);

    lib.closeSharedMemory(handle);
  });
});

describe("ReadSharedMemory", function () {
  it("should create, open, write and read from shared memory", function () {
    const cHandle = lib.createSharedMemory(
      "/TestSharedMemory",
      (lib.sharedMemoryFileMode.S_IRUSR | lib.sharedMemoryFileMode.S_IWUSR),
      4096
    );
    const oHandle = lib.openSharedMemory(
      "/TestSharedMemory",
      4096
    );

    assert.ok(cHandle);
    assert.ok(oHandle);

    lib.writeSharedData(cHandle, "hello wòrld!!");
    const text = lib.readSharedData(oHandle, "utf8");

    assert.strictEqual("hello wòrld!!", text);

    lib.closeSharedMemory(oHandle);
    lib.closeSharedMemory(cHandle);
  });
});
/*
describe("WriteSharedMemorySerial", function () {
  it("should create and write in a serial way to shared memory", function () {
    const smHandle = lib.createSharedMemory(
      "Local\\TestSharedMemory",
      lib.sharedMemoryPageAccess.ReadWrite,
      lib.sharedMemoryFileMapAccess.AllAccess,
      4096
    );
    const mHandle = synchronize.createMutex("Local\\TestMutex");

    assert.ok(smHandle);
    assert.ok(mHandle);

    for (let i = 0; i < 100000; i++) {
      synchronize.waitMutex(mHandle, synchronize.waitTime.Infinite);

      lib.writeSharedData(smHandle, "hello world: " + i);

      synchronize.releaseMutex(mHandle);
    }

    const text = lib.readSharedData(smHandle, "utf8");
    assert.strictEqual("hello world: 99999", text);

    synchronize.closeMutex(mHandle);
    lib.closeSharedMemory(smHandle);
  });
});
*/

