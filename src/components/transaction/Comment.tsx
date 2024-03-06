import { useTheme } from "@react-navigation/native";
import { formatDistanceToNow, parseISO } from "date-fns";
import { View, Text } from "react-native";

import IComment from "../../lib/types/Comment";
import { palette } from "../../theme";
import UserMention from "../UserMention";

export default function Comment({ comment }: { comment: IComment }) {
  const { colors: themeColors } = useTheme();

  return (
    <View
      key={comment.id}
      style={
        comment.admin_only
          ? {
              backgroundColor: "#ff8c3710",
              borderColor: "#ff8c37",
              borderStyle: "dashed",
              borderWidth: 1,
              borderRadius: 8,
              padding: 8,
              marginHorizontal: -8,
            }
          : undefined
      }
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 2,
        }}
      >
        <UserMention user={comment.user} />
        <Text style={{ color: palette.muted }}>
          {formatDistanceToNow(parseISO(comment.created_at))} ago
        </Text>
      </View>

      <Text style={{ color: themeColors.text }} selectable>
        {comment.content}
      </Text>
    </View>
  );
}
