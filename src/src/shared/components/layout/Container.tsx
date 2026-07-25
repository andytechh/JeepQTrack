// src/shared/components/layout/Container.tsx
import React from "react";
import {
  RefreshControl,
  ScrollView,
  ScrollViewProps
} from "react-native";

interface ContainerProps extends ScrollViewProps {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  className?: string;
  contentContainerClassName?: string;
}

export const Container: React.FC<ContainerProps> = ({
  children,
  refreshing = false,
  onRefresh,
  className = "",
  contentContainerClassName = "",
  ...props
}) => {
  return (
    <ScrollView
      className={`flex-1 bg-gray-50 ${className}`}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      contentContainerClassName={contentContainerClassName}
      showsVerticalScrollIndicator={false}
      {...props}
    >
      {children}
    </ScrollView>
  );
};
