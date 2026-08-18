import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import {
  FlatList,
  ListRenderItemInfo,
  RefreshControl,
  Text,
  View,
} from "react-native";

import ChatEmptyState from "./ChatEmptyState";
import ChatMessageBubble, { ChatMessage } from "./ChatMessageBubble";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId?: string;
  loading: boolean;
  hasMore: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onLoadOlder: () => void;
  onLongPress: (message: ChatMessage) => void;
  onReaction: (message: ChatMessage, emoji: string) => void;
}

export interface ChatMessageListRef {
  scrollToLatest: (animated?: boolean) => void;
}

const ChatMessageList = forwardRef<ChatMessageListRef, ChatMessageListProps>(
  function ChatMessageList(
    {
      messages,
      currentUserId,
      loading,
      hasMore,
      refreshing,
      onRefresh,
      onLoadOlder,
      onLongPress,
      onReaction,
    },
    ref,
  ) {
    const listRef = useRef<FlatList<ChatMessage>>(null);

    useImperativeHandle(ref, () => ({
      scrollToLatest(animated = false) {
        listRef.current?.scrollToEnd({
          animated,
        });
      },
    }));

    const renderItem = useCallback(
      ({ item }: ListRenderItemInfo<ChatMessage>) => {
        return (
          <ChatMessageBubble
            message={item}
            currentUserId={currentUserId}
            onLongPress={onLongPress}
            onReaction={onReaction}
          />
        );
      },
      [currentUserId, onLongPress, onReaction],
    );

    const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

    return (
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        className="flex-1 bg-[#EEF8FF]"
        contentContainerStyle={{
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 14,
          flexGrow: messages.length === 0 ? 1 : undefined,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}

        /*
         * Rendering optimization.
         *
         * The database can contain hundreds/thousands
         * of messages, but RN only renders a small window.
         */
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={16}
        windowSize={5}
        removeClippedSubviews={true}

        /*
         * Older messages are loaded when the user reaches
         * the beginning of the currently loaded array.
         */
        onStartReached={() => {
          if (!loading && hasMore) {
            onLoadOlder();
          }
        }}
        onStartReachedThreshold={0.15}

        /*
         * Important when prepending older messages.
         * Keeps the user's current position instead of
         * jumping them around.
         */
        maintainVisibleContentPosition={{
          minIndexForVisible: 1,
          autoscrollToTopThreshold: 10,
        }}

        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0284C7"
          />
        }

        ListHeaderComponent={
          hasMore ? (
            <View className="mb-3 items-center">
              <Text className="text-[10px] font-semibold text-[#94A3B8]">
                Scroll up for older messages
              </Text>
            </View>
          ) : null
        }

        ListEmptyComponent={!loading ? <ChatEmptyState /> : null}
      />
    );
  },
);

export default ChatMessageList;
