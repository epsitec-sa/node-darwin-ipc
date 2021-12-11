{
  "targets": [
    {
      "target_name": "sharedMemory",
      "include_dirs": [
          "<!(node -e \"require('napi-macros')\")"
      ],
      "sources": [ "./src/sharedMemory.cpp" ],
      "libraries": [],
    },
    {
      "target_name": "messaging",
      "include_dirs": [
          "<!(node -e \"require('napi-macros')\")"
      ],
      "sources": [ "./src/messaging.cpp" ],
      "libraries": [],
    }
  ]
}