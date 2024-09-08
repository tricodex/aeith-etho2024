import AgentChat from "@/components/AgentChat";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const ChatPage = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat</CardTitle>
      </CardHeader>
      <CardContent>
        <AgentChat />
      </CardContent>
    </Card>
  );
};

export default ChatPage;