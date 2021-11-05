#include <node_api.h>
#include <napi-macros.h>

#include <windows.h>
#include <sddl.h>
#include <string>

struct SharedMemoryHandle
{
  HANDLE hMapFile;
  LPCTSTR pBuf;
  int size;
};

// string name, int pageAccess, int fileMapAccess, int memSize, string sddl, SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(CreateSharedMemory)
{
  int result = 0;

  NAPI_ARGV(6)

  NAPI_ARGV_UTF8(objectNameA, 1000, 0)
  NAPI_ARGV_INT32(sharedMemoryPageAccess, 1)
  NAPI_ARGV_INT32(sharedMemoryFileMapAccess, 2)
  NAPI_ARGV_INT32(memorySize, 3)
  NAPI_ARGV_UTF8(sddlStringA, 1000, 4)
  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 5)

  LPSECURITY_ATTRIBUTES pAttributes = NULL;
  SECURITY_ATTRIBUTES attributes;

  if (strcmp(sddlStringA, "") != 0)
  {
    ZeroMemory(&attributes, sizeof(attributes));
    attributes.nLength = sizeof(attributes);
    ConvertStringSecurityDescriptorToSecurityDescriptor(
      sddlStringA,
      SDDL_REVISION_1,
      &attributes.lpSecurityDescriptor,
      NULL);
  }

  memoryHandle->hMapFile = CreateFileMapping(INVALID_HANDLE_VALUE, pAttributes, sharedMemoryPageAccess, 0, memorySize, objectNameA);
  if (memoryHandle->hMapFile == NULL)
  {
    result = GetLastError();
    NAPI_RETURN_INT32(result)
  }

  memoryHandle->pBuf = (LPTSTR)MapViewOfFile(memoryHandle->hMapFile, sharedMemoryFileMapAccess, 0, 0, memorySize);
  if (memoryHandle->pBuf == NULL)
  {
    CloseHandle(memoryHandle->hMapFile);

    result = 0 - GetLastError();
    NAPI_RETURN_INT32(result);
  }
  memoryHandle->size = memorySize;

  NAPI_RETURN_INT32(result)
}

// string name, int fileMapAccess, int memSize, SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(OpenSharedMemory)
{
  int result = 0;

  NAPI_ARGV(4)

  NAPI_ARGV_UTF8(objectNameA, 1000, 0)
  NAPI_ARGV_INT32(sharedMemoryPageAccess, 1)
  NAPI_ARGV_INT32(memorySize, 2)
  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 3)

  memoryHandle->hMapFile = OpenFileMapping(sharedMemoryPageAccess, FALSE, objectNameA);
  if (memoryHandle->hMapFile == NULL)
  {
    result = GetLastError();
    NAPI_RETURN_INT32(result)
  }

  memoryHandle->pBuf = (LPTSTR)MapViewOfFile(memoryHandle->hMapFile, sharedMemoryPageAccess, 0, 0, memorySize);
  if (memoryHandle->pBuf == NULL)
  {
    CloseHandle(memoryHandle->hMapFile);

    result = 0 - GetLastError();
    NAPI_RETURN_INT32(result);
  }
  memoryHandle->size = memorySize;

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
    result = 1;
    NAPI_RETURN_INT32(result)
  }

  RtlMoveMemory((PVOID)memoryHandle->pBuf, data, dataSize);

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
    result = 1;
    NAPI_RETURN_INT32(result)
  }

  RtlMoveMemory(data, (PVOID)memoryHandle->pBuf, memoryHandle->size);

  NAPI_RETURN_INT32(result)
}

// SharedMemoryHandle* memoryHandle -> int
NAPI_METHOD(CloseSharedMemory)
{
  int result = 0;

  NAPI_ARGV(1)

  NAPI_ARGV_BUFFER_CAST(struct SharedMemoryHandle *, memoryHandle, 0)

  UnmapViewOfFile(memoryHandle->pBuf);

  CloseHandle(memoryHandle->hMapFile);

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