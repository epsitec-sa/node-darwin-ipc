#include <node_api.h>
#include <napi-macros.h>

#include <fcntl.h> // for flags O_CREAT etc..
#include <stdio.h>
#include <string.h>
#include <sys/mman.h> // for mmap, shm_open
#include <unistd.h> // for close()
#include <errno.h>

#define SHM_NAME_MAX 32
#define SHM_FLAGS_CREATE (O_CREAT | O_RDWR | O_EXCL)
#define SHM_FLAGS_OPEN (O_RDONLY)

struct SharedMemoryHandle
{
  char name[SHM_NAME_MAX];
  int fileDescriptor;
  char* memoryAddr;
  int size;
};

// string name, int sharedMemoryFileMode, int memSize, SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(CreateSharedMemory)
{
  int result = 0;

  NAPI_ARGV(4)

  NAPI_ARGV_UTF8(sharedMemoryName, 1000, 0)
  NAPI_ARGV_INT32(sharedMemoryFileMode, 1)
  NAPI_ARGV_INT32(memorySize, 2)
  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 3)


  memoryHandle->fileDescriptor = shm_open(sharedMemoryName, SHM_FLAGS_CREATE, sharedMemoryFileMode);
  if (memoryHandle->fileDescriptor == -1) {
    if (errno == EEXIST) { // shared memory already exists (has not been unlinked and is abandoned)
      printf("shm is abandoned\n");
      if (shm_unlink(sharedMemoryName) != 0) {
        NAPI_RETURN_INT32(errno)
      }
      memoryHandle->fileDescriptor = shm_open(sharedMemoryName, SHM_FLAGS_CREATE, sharedMemoryFileMode);
      if (memoryHandle->fileDescriptor == -1) {
        NAPI_RETURN_INT32(errno)
      }
    } else {
      NAPI_RETURN_INT32(errno)
    }
  }

  // extend the shmem size
  if (ftruncate(memoryHandle->fileDescriptor, memorySize) != 0) {
    NAPI_RETURN_INT32(errno)
  }

  // map some memory to shmem segment to write to.
  memoryHandle->memoryAddr = (char*)mmap(NULL, memorySize, PROT_WRITE, MAP_SHARED, memoryHandle->fileDescriptor, 0);
  if (memoryHandle->memoryAddr == MAP_FAILED) {
    NAPI_RETURN_INT32(errno)
  }
  memoryHandle->size = memorySize;
  strcpy(memoryHandle->name, sharedMemoryName);

  NAPI_RETURN_INT32(result)
}

// string name, int memSize, SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(OpenSharedMemory)
{
  int result = 0;

  NAPI_ARGV(3)

  NAPI_ARGV_UTF8(sharedMemoryName, 1000, 0)
  NAPI_ARGV_INT32(memorySize, 1)
  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 2)

  memoryHandle->fileDescriptor = shm_open(sharedMemoryName, SHM_FLAGS_OPEN, S_IRUSR);
  if (memoryHandle->fileDescriptor == -1) {
    NAPI_RETURN_INT32(errno)
  }

  // map some memory to shmem segment to write to.
  memoryHandle->memoryAddr = (char*)mmap(NULL, memorySize, PROT_READ, MAP_SHARED, memoryHandle->fileDescriptor, 0);
  if (memoryHandle->memoryAddr == MAP_FAILED) {
    NAPI_RETURN_INT32(errno)
  }
  memoryHandle->size = memorySize;
  strcpy(memoryHandle->name, sharedMemoryName);

  NAPI_RETURN_INT32(result)
}

// SharedMemoryHandle* memoryHandle, byte* data, int dataSize -> int
NAPI_METHOD(WriteSharedData)
{
  int result = 0;

  NAPI_ARGV(3)

  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 0)
  NAPI_ARGV_BUFFER_CAST(char *, data, 1)
  NAPI_ARGV_INT32(dataSize, 2)

  if (dataSize > memoryHandle->size)
  {
    result = -1;
    NAPI_RETURN_INT32(result)
  }

  strncpy(memoryHandle->memoryAddr, data, dataSize);

  NAPI_RETURN_INT32(result)
}

// SharedMemoryHandle* memoryHandle, byte* data, int dataSize -> int
NAPI_METHOD(ReadSharedData)
{
  int result = 0;

  NAPI_ARGV(3)

  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 0)
  NAPI_ARGV_BUFFER_CAST(char *, data, 1)
  NAPI_ARGV_INT32(dataSize, 2)

  if (dataSize > memoryHandle->size)
  {
    result = -1;
    NAPI_RETURN_INT32(result)
  }

  strncpy(data, memoryHandle->memoryAddr, memoryHandle->size);

  NAPI_RETURN_INT32(result)
}

// SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(CloseSharedMemory)
{
  int result = 0;

  NAPI_ARGV(1)

  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 0)

  // unmap the memory and close the file descriptor
  if (munmap((void*)memoryHandle->memoryAddr, memoryHandle->size) != 0) {
    NAPI_RETURN_INT32(errno)
  }
  
  if (close(memoryHandle->fileDescriptor) != 0) {
    NAPI_RETURN_INT32(errno)
  }
  
  if (shm_unlink(memoryHandle->name) != 0) {
    NAPI_RETURN_INT32(errno)
  }

  NAPI_RETURN_INT32(result)
}

// SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(GetSharedMemorySize)
{
  int result = 0;

  NAPI_ARGV(1)

  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 0)

  result = memoryHandle->size;

  NAPI_RETURN_INT32(result)
}

NAPI_INIT()
{
  NAPI_EXPORT_FUNCTION(CreateSharedMemory)
  NAPI_EXPORT_FUNCTION(OpenSharedMemory)
  NAPI_EXPORT_FUNCTION(WriteSharedData)
  NAPI_EXPORT_FUNCTION(ReadSharedData)
  NAPI_EXPORT_FUNCTION(CloseSharedMemory)
  NAPI_EXPORT_FUNCTION(GetSharedMemorySize)

  NAPI_EXPORT_SIZEOF_STRUCT(SharedMemoryHandle)
  NAPI_EXPORT_ALIGNMENTOF(SharedMemoryHandle)
}