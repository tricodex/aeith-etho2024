// src/components/AeithPage.tsx

'use client';

import React, { useState, useEffect, useRef } from 'react';
import useAITools from '@/hooks/useAITools';
import { useAgentFactory } from '@/hooks/useAgentFactory';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

interface MarketAnalysis {
  overallSentiment: "Bullish" | "Bearish" | "Neutral";
  keyFactors: string[];
  potentialRisks: string[];
  recommendations: string[];
}

interface AISimulation {
  scenario: string;
  agents: Array<{
    name: string;
    role: string;
    action: string;
  }>;
  outcome: string;
  ethicalConsiderations: string[];
}

type ResultType = MarketAnalysis | AISimulation | string | null;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const AeithPage: React.FC = () => {
  const {
    loading,
    error,
    runMarketAnalysis,
    runAISimulation,
    generateTradingStrategy,
    auditSmartContract,
    generateDeFiStrategy,
    predictMarketTrends,
    analyzeOnChainData,
    generateNFTIdea,
    analyzeCryptoRegulation,
  } = useAITools();

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
  // const { createAgent, getAgentMessages, addMessage, error: agentError } = useAgentFactory(contractAddress);
  const { createAgent, addMessage, getAgentMessages, isAgentFinished, error: agentError } = useAgentFactory(contractAddress);

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('chat');
  const [result, setResult] = useState<ResultType>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatAgentId, setChatAgentId] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (agentError) {
      toast({
        title: "Error",
        description: agentError,
        variant: "destructive",
      });
    }
  }, [agentError, toast]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setResult(null);
  };

  const handleAction = async (action: () => Promise<ResultType>) => {
    try {
      setResult(null);
      const data = await action();
      setResult(data);
      toast({
        title: "Success",
        description: "Operation completed successfully",
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleChatSubmit = async () => {
    if (!inputMessage.trim()) return;

    setIsChatLoading(true);
    try {
      if (chatAgentId === null) {
        // Start a new chat
        const newAgentId = await createAgent("You are a helpful AI assistant.", 10);
        setChatAgentId(newAgentId);
        await addMessage(newAgentId, inputMessage);
      } else {
        // Add message to existing chat
        await addMessage(chatAgentId, inputMessage);
      }

      // Update UI with user message
      setChatMessages(prev => [...prev, { role: 'user', content: inputMessage }]);
      setInputMessage('');

      // Fetch the updated message history
      const messages = await getAgentMessages(chatAgentId!);
      const assistantMessages = messages.filter(msg => msg.role === 'assistant');
      if (assistantMessages.length > 0) {
        const lastAssistantMessage = assistantMessages[assistantMessages.length - 1];
        setChatMessages(prev => [...prev, { 
          role: 'assistant', 
          content: lastAssistantMessage.content[0].value 
        }]);
      }

      // Check if the chat is finished
      const finished = await isAgentFinished(chatAgentId!);
      if (finished) {
        console.log("Chat finished");
        // Handle chat completion (e.g., disable input, show a message)
      }
    } catch (err) {
      console.error("Error in chat interaction:", err);
      // Handle error (e.g., show an error message to the user)
    } finally {
      setIsChatLoading(false);
    }
  };


  return (
    <div className="container mx-auto p-4">
      <Card className="w-full">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-3xl font-bold">Aeith AI Tools</CardTitle>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Switch
                    checked={darkMode}
                    onCheckedChange={setDarkMode}
                    id="dark-mode"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Toggle Dark Mode</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <CardDescription>Advanced AI-powered tools for crypto analysis and strategy</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid grid-cols-4 gap-2 mb-4">
              <TabsTrigger value="chat">AI Chat</TabsTrigger>
              <TabsTrigger value="market-analysis">Market Analysis</TabsTrigger>
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="defi">DeFi</TabsTrigger>
            </TabsList>
            
            <TabsContent value="chat">
              <Card>
                <CardHeader>
                  <CardTitle>AI Assistant Chat</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    {chatMessages.map((msg, index) => (
                      <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
                        <div className={`flex items-start ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <Avatar className="w-8 h-8 mr-2">
                            <AvatarImage src={msg.role === 'user' ? '/svgs/aeith-logo.svg' : '/svgs/aeith-logo.svg'} />
                            <AvatarFallback>{msg.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                          </Avatar>
                          <div className={`rounded-lg p-2 ${msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            {msg.content}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </ScrollArea>
                  <div className="flex mt-4">
                    <Input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message here..."
                      className="flex-grow mr-2"
                    />
                    <Button onClick={handleChatSubmit}>Send</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="market-analysis">
              <Card>
                <CardHeader>
                  <CardTitle>Market Analysis Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="market-analysis">
                      <AccordionTrigger>Asset Market Analysis</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="marketAnalysisAsset">Asset for Market Analysis</Label>
                          <div className="flex space-x-2">
                            <Input id="marketAnalysisAsset" placeholder="Enter asset (e.g., Bitcoin)" />
                            <Button onClick={() => handleAction(() => runMarketAnalysis((document.getElementById('marketAnalysisAsset') as HTMLInputElement).value))}>
                              Analyze
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="ai-simulation">
                      <AccordionTrigger>AI Simulation</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="aiSimulationScenario">AI Simulation Scenario</Label>
                          <div className="flex space-x-2">
                            <Input id="aiSimulationScenario" placeholder="Enter simulation scenario" />
                            <Button onClick={() => handleAction(() => runAISimulation((document.getElementById('aiSimulationScenario') as HTMLInputElement).value))}>
                              Run Simulation
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="market-trends">
                      <AccordionTrigger>Market Trends Prediction</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="marketTrendsTimeframe">Timeframe</Label>
                          <Input id="marketTrendsTimeframe" placeholder="Enter timeframe" />
                          <Label htmlFor="marketTrendsAssets">Assets</Label>
                          <Input id="marketTrendsAssets" placeholder="Enter assets (comma-separated)" />
                          <Button onClick={() => handleAction(() => predictMarketTrends(
                            (document.getElementById('marketTrendsTimeframe') as HTMLInputElement).value,
                            (document.getElementById('marketTrendsAssets') as HTMLInputElement).value.split(',')
                          ))}>
                            Predict Trends
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="trading">
              <Card>
                <CardHeader>
                  <CardTitle>Trading Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="trading-strategy">
                      <AccordionTrigger>Generate Trading Strategy</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="tradingStrategyAsset">Asset</Label>
                          <Input id="tradingStrategyAsset" placeholder="Enter asset" />
                          <Label htmlFor="tradingStrategyTimeframe">Timeframe</Label>
                          <Input id="tradingStrategyTimeframe" placeholder="Enter timeframe" />
                          <Button onClick={() => handleAction(() => generateTradingStrategy(
                            (document.getElementById('tradingStrategyAsset') as HTMLInputElement).value,
                            (document.getElementById('tradingStrategyTimeframe') as HTMLInputElement).value
                          ))}>
                            Generate Strategy
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="smart-contract-audit">
                      <AccordionTrigger>Smart Contract Audit</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="smartContractCode">Smart Contract Code</Label>
                          <Textarea id="smartContractCode" placeholder="Paste smart contract code here" className="min-h-[200px]" />
                          <Button onClick={() => handleAction(() => auditSmartContract((document.getElementById('smartContractCode') as HTMLTextAreaElement).value))}>
                            Audit Contract
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="defi">
              <Card>
                <CardHeader>
                  <CardTitle>DeFi Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible>
                    <AccordionItem value="defi-strategy">
                      <AccordionTrigger>Generate DeFi Strategy</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="defiStrategyGoal">Investment Goal</Label>
                          <Input id="defiStrategyGoal" placeholder="Enter investment goal" />
                          <Label htmlFor="defiStrategyRisk">Risk Tolerance</Label>
                          <Input id="defiStrategyRisk" placeholder="Enter risk tolerance" />
                          <Button onClick={() => handleAction(() => generateDeFiStrategy(
                            (document.getElementById('defiStrategyGoal') as HTMLInputElement).value,
                            (document.getElementById('defiStrategyRisk') as HTMLInputElement).value
                          ))}>
                            Generate Strategy
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="on-chain-analysis">
                      <AccordionTrigger>Analyze On-Chain Data</AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2">
                          <Label htmlFor="onChainAddress">Address</Label>
                          <Input id="onChainAddress" placeholder="Enter address" />
                          <Label htmlFor="onChainChainId">Chain ID</Label>
                          <Input id="onChainChainId" type="number" placeholder="Enter chain ID" />
                          <Button onClick={() => handleAction(() => analyzeOnChainData(
                            (document.getElementById('onChainAddress') as HTMLInputElement).value,
                            parseInt((document.getElementById('onChainChainId') as HTMLInputElement).value)
                          ))}>
                            Analyze
                          </Button>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                    </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {loading && (
            <div className="mt-4">
              <Progress value={33} className="w-full" />
              <p className="text-center mt-2">Processing your request...</p>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                  <pre className="whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button variant="outline" onClick={() => handleAction(() => generateNFTIdea("Cyberpunk"))}>
                Generate NFT Idea
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80">
              <h3 className="font-semibold">NFT Idea Generator</h3>
              <p>Generate a unique NFT collection idea based on the Cyberpunk theme.</p>
            </HoverCardContent>
          </HoverCard>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">Analyze Crypto Regulation</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Crypto Regulation Analysis</DialogTitle>
                <DialogDescription>
                  Enter a country to analyze its cryptocurrency regulations.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="regulationCountry" className="text-right">
                    Country
                  </Label>
                  <Input id="regulationCountry" placeholder="Enter country name" className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => handleAction(() => analyzeCryptoRegulation((document.getElementById('regulationCountry') as HTMLInputElement).value))}>
                  Analyze
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardFooter>
      </Card>

      <CommandDialog open={false}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem>Market Analysis</CommandItem>
            <CommandItem>Trading Strategy</CommandItem>
            <CommandItem>DeFi Strategy</CommandItem>
            <CommandItem>NFT Idea</CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </div>
  );
};

export default AeithPage;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setIsChatLoading(arg0: boolean) {
  throw new Error('Function not implemented.');
}
