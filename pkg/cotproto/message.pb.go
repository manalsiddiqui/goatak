// Code generated by protoc-gen-go. DO NOT EDIT.
// versions:
// 	protoc-gen-go v1.31.0
// 	protoc        v4.25.1
// source: message.proto

package cotproto

import (
	protoreflect "google.golang.org/protobuf/reflect/protoreflect"
	protoimpl "google.golang.org/protobuf/runtime/protoimpl"
	reflect "reflect"
	sync "sync"
)

const (
	// Verify that this generated code is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(20 - protoimpl.MinVersion)
	// Verify that runtime/protoimpl is sufficiently up-to-date.
	_ = protoimpl.EnforceVersion(protoimpl.MaxVersion - 20)
)

// Container for TakMessage and metadata, such as groups
type Message struct {
	state         protoimpl.MessageState
	sizeCache     protoimpl.SizeCache
	unknownFields protoimpl.UnknownFields

	Payload        *TakMessage `protobuf:"bytes,1,opt,name=payload,proto3" json:"payload,omitempty"`
	Source         string      `protobuf:"bytes,2,opt,name=source,proto3" json:"source,omitempty"`
	ClientId       string      `protobuf:"bytes,3,opt,name=clientId,proto3" json:"clientId,omitempty"`
	Groups         []string    `protobuf:"bytes,4,rep,name=groups,proto3" json:"groups,omitempty"`
	DestClientUids []string    `protobuf:"bytes,5,rep,name=destClientUids,proto3" json:"destClientUids,omitempty"`
	DestCallsigns  []string    `protobuf:"bytes,6,rep,name=destCallsigns,proto3" json:"destCallsigns,omitempty"`
	Provenance     []string    `protobuf:"bytes,7,rep,name=provenance,proto3" json:"provenance,omitempty"`
	Archive        bool        `protobuf:"varint,8,opt,name=archive,proto3" json:"archive,omitempty"`
	FeedUuid       string      `protobuf:"bytes,9,opt,name=feedUuid,proto3" json:"feedUuid,omitempty"`
	ConnectionId   string      `protobuf:"bytes,10,opt,name=connectionId,proto3" json:"connectionId,omitempty"`
	// optional sequence of binary payloads
	Bloads []*BinaryPayload `protobuf:"bytes,11,rep,name=bloads,proto3" json:"bloads,omitempty"`
}

func (x *Message) Reset() {
	*x = Message{}

	if protoimpl.UnsafeEnabled {
		mi := &file_message_proto_msgTypes[0]
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		ms.StoreMessageInfo(mi)
	}
}

func (x *Message) String() string {
	return protoimpl.X.MessageStringOf(x)
}

func (*Message) ProtoMessage() {}

func (x *Message) ProtoReflect() protoreflect.Message {
	mi := &file_message_proto_msgTypes[0]

	if protoimpl.UnsafeEnabled && x != nil {
		ms := protoimpl.X.MessageStateOf(protoimpl.Pointer(x))
		if ms.LoadMessageInfo() == nil {
			ms.StoreMessageInfo(mi)
		}

		return ms
	}

	return mi.MessageOf(x)
}

// Deprecated: Use Message.ProtoReflect.Descriptor instead.
func (*Message) Descriptor() ([]byte, []int) {
	return file_message_proto_rawDescGZIP(), []int{0}
}

func (x *Message) GetPayload() *TakMessage {
	if x != nil {
		return x.Payload
	}

	return nil
}

func (x *Message) GetSource() string {
	if x != nil {
		return x.Source
	}

	return ""
}

func (x *Message) GetClientId() string {
	if x != nil {
		return x.ClientId
	}

	return ""
}

func (x *Message) GetGroups() []string {
	if x != nil {
		return x.Groups
	}

	return nil
}

func (x *Message) GetDestClientUids() []string {
	if x != nil {
		return x.DestClientUids
	}

	return nil
}

func (x *Message) GetDestCallsigns() []string {
	if x != nil {
		return x.DestCallsigns
	}

	return nil
}

func (x *Message) GetProvenance() []string {
	if x != nil {
		return x.Provenance
	}

	return nil
}

func (x *Message) GetArchive() bool {
	if x != nil {
		return x.Archive
	}

	return false
}

func (x *Message) GetFeedUuid() string {
	if x != nil {
		return x.FeedUuid
	}

	return ""
}

func (x *Message) GetConnectionId() string {
	if x != nil {
		return x.ConnectionId
	}

	return ""
}

func (x *Message) GetBloads() []*BinaryPayload {
	if x != nil {
		return x.Bloads
	}

	return nil
}

var File_message_proto protoreflect.FileDescriptor

var file_message_proto_rawDesc = []byte{
	0x0a, 0x0d, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x1a,
	0x10, 0x74, 0x61, 0x6b, 0x6d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65, 0x2e, 0x70, 0x72, 0x6f, 0x74,
	0x6f, 0x1a, 0x13, 0x62, 0x69, 0x6e, 0x61, 0x72, 0x79, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64,
	0x2e, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x22, 0xec, 0x02, 0x0a, 0x07, 0x4d, 0x65, 0x73, 0x73, 0x61,
	0x67, 0x65, 0x12, 0x25, 0x0a, 0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x18, 0x01, 0x20,
	0x01, 0x28, 0x0b, 0x32, 0x0b, 0x2e, 0x54, 0x61, 0x6b, 0x4d, 0x65, 0x73, 0x73, 0x61, 0x67, 0x65,
	0x52, 0x07, 0x70, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x12, 0x16, 0x0a, 0x06, 0x73, 0x6f, 0x75,
	0x72, 0x63, 0x65, 0x18, 0x02, 0x20, 0x01, 0x28, 0x09, 0x52, 0x06, 0x73, 0x6f, 0x75, 0x72, 0x63,
	0x65, 0x12, 0x1a, 0x0a, 0x08, 0x63, 0x6c, 0x69, 0x65, 0x6e, 0x74, 0x49, 0x64, 0x18, 0x03, 0x20,
	0x01, 0x28, 0x09, 0x52, 0x08, 0x63, 0x6c, 0x69, 0x65, 0x6e, 0x74, 0x49, 0x64, 0x12, 0x16, 0x0a,
	0x06, 0x67, 0x72, 0x6f, 0x75, 0x70, 0x73, 0x18, 0x04, 0x20, 0x03, 0x28, 0x09, 0x52, 0x06, 0x67,
	0x72, 0x6f, 0x75, 0x70, 0x73, 0x12, 0x26, 0x0a, 0x0e, 0x64, 0x65, 0x73, 0x74, 0x43, 0x6c, 0x69,
	0x65, 0x6e, 0x74, 0x55, 0x69, 0x64, 0x73, 0x18, 0x05, 0x20, 0x03, 0x28, 0x09, 0x52, 0x0e, 0x64,
	0x65, 0x73, 0x74, 0x43, 0x6c, 0x69, 0x65, 0x6e, 0x74, 0x55, 0x69, 0x64, 0x73, 0x12, 0x24, 0x0a,
	0x0d, 0x64, 0x65, 0x73, 0x74, 0x43, 0x61, 0x6c, 0x6c, 0x73, 0x69, 0x67, 0x6e, 0x73, 0x18, 0x06,
	0x20, 0x03, 0x28, 0x09, 0x52, 0x0d, 0x64, 0x65, 0x73, 0x74, 0x43, 0x61, 0x6c, 0x6c, 0x73, 0x69,
	0x67, 0x6e, 0x73, 0x12, 0x1e, 0x0a, 0x0a, 0x70, 0x72, 0x6f, 0x76, 0x65, 0x6e, 0x61, 0x6e, 0x63,
	0x65, 0x18, 0x07, 0x20, 0x03, 0x28, 0x09, 0x52, 0x0a, 0x70, 0x72, 0x6f, 0x76, 0x65, 0x6e, 0x61,
	0x6e, 0x63, 0x65, 0x12, 0x18, 0x0a, 0x07, 0x61, 0x72, 0x63, 0x68, 0x69, 0x76, 0x65, 0x18, 0x08,
	0x20, 0x01, 0x28, 0x08, 0x52, 0x07, 0x61, 0x72, 0x63, 0x68, 0x69, 0x76, 0x65, 0x12, 0x1a, 0x0a,
	0x08, 0x66, 0x65, 0x65, 0x64, 0x55, 0x75, 0x69, 0x64, 0x18, 0x09, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x08, 0x66, 0x65, 0x65, 0x64, 0x55, 0x75, 0x69, 0x64, 0x12, 0x22, 0x0a, 0x0c, 0x63, 0x6f, 0x6e,
	0x6e, 0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x49, 0x64, 0x18, 0x0a, 0x20, 0x01, 0x28, 0x09, 0x52,
	0x0c, 0x63, 0x6f, 0x6e, 0x6e, 0x65, 0x63, 0x74, 0x69, 0x6f, 0x6e, 0x49, 0x64, 0x12, 0x26, 0x0a,
	0x06, 0x62, 0x6c, 0x6f, 0x61, 0x64, 0x73, 0x18, 0x0b, 0x20, 0x03, 0x28, 0x0b, 0x32, 0x0e, 0x2e,
	0x42, 0x69, 0x6e, 0x61, 0x72, 0x79, 0x50, 0x61, 0x79, 0x6c, 0x6f, 0x61, 0x64, 0x52, 0x06, 0x62,
	0x6c, 0x6f, 0x61, 0x64, 0x73, 0x42, 0x26, 0x48, 0x03, 0x5a, 0x22, 0x67, 0x69, 0x74, 0x68, 0x75,
	0x62, 0x2e, 0x63, 0x6f, 0x6d, 0x2f, 0x6b, 0x64, 0x75, 0x64, 0x6b, 0x6f, 0x76, 0x2f, 0x67, 0x6f,
	0x61, 0x74, 0x61, 0x6b, 0x2f, 0x63, 0x6f, 0x74, 0x70, 0x72, 0x6f, 0x74, 0x6f, 0x62, 0x06, 0x70,
	0x72, 0x6f, 0x74, 0x6f, 0x33,
}

var (
	file_message_proto_rawDescOnce sync.Once
	file_message_proto_rawDescData = file_message_proto_rawDesc
)

func file_message_proto_rawDescGZIP() []byte {
	file_message_proto_rawDescOnce.Do(func() {
		file_message_proto_rawDescData = protoimpl.X.CompressGZIP(file_message_proto_rawDescData)
	})

	return file_message_proto_rawDescData
}

var file_message_proto_msgTypes = make([]protoimpl.MessageInfo, 1)
var file_message_proto_goTypes = []interface{}{
	(*Message)(nil),       // 0: Message
	(*TakMessage)(nil),    // 1: TakMessage
	(*BinaryPayload)(nil), // 2: BinaryPayload
}
var file_message_proto_depIdxs = []int32{
	1, // 0: Message.payload:type_name -> TakMessage
	2, // 1: Message.bloads:type_name -> BinaryPayload
	2, // [2:2] is the sub-list for method output_type
	2, // [2:2] is the sub-list for method input_type
	2, // [2:2] is the sub-list for extension type_name
	2, // [2:2] is the sub-list for extension extendee
	0, // [0:2] is the sub-list for field type_name
}

func init() { file_message_proto_init() }
func file_message_proto_init() {
	if File_message_proto != nil {
		return
	}

	file_takmessage_proto_init()
	file_binarypayload_proto_init()

	if !protoimpl.UnsafeEnabled {
		file_message_proto_msgTypes[0].Exporter = func(v interface{}, i int) interface{} {
			switch v := v.(*Message); i {
			case 0:
				return &v.state
			case 1:
				return &v.sizeCache
			case 2:
				return &v.unknownFields
			default:
				return nil
			}
		}
	}

	type x struct{}

	out := protoimpl.TypeBuilder{
		File: protoimpl.DescBuilder{
			GoPackagePath: reflect.TypeOf(x{}).PkgPath(),
			RawDescriptor: file_message_proto_rawDesc,
			NumEnums:      0,
			NumMessages:   1,
			NumExtensions: 0,
			NumServices:   0,
		},
		GoTypes:           file_message_proto_goTypes,
		DependencyIndexes: file_message_proto_depIdxs,
		MessageInfos:      file_message_proto_msgTypes,
	}.Build()
	File_message_proto = out.File
	file_message_proto_rawDesc = nil
	file_message_proto_goTypes = nil
	file_message_proto_depIdxs = nil
}
