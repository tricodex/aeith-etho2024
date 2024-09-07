'use client';
import React, { useState } from 'react';
import useAITools from '@/components/AI/Tools';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

const GrandhardPage: React.FC = () => {
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

  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('market-analysis');
  const [result, setResult] = useState<any>(null);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setResult(null);
  };

  const handleAction = async (action: () => Promise<any>) => {
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

  return (
    <Card className="w-full max-w-7xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl font-bold">Grandhard AI Tools</CardTitle>
        <CardDescription>Advanced AI-powered tools for crypto analysis and strategy</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3 gap-2 mb-4">
            <TabsTrigger value="market-analysis">Market Analysis</TabsTrigger>
            <TabsTrigger value="trading">Trading</TabsTrigger>
            <TabsTrigger value="defi">DeFi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market-analysis">
            <Card>
              <CardHeader>
                <CardTitle>Market Analysis Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block mb-2">Asset for Market Analysis</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Enter asset (e.g., Bitcoin)" id="marketAnalysisAsset" />
                    <Button onClick={() => handleAction(() => runMarketAnalysis((document.getElementById('marketAnalysisAsset') as HTMLInputElement).value))}>
                      Analyze
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2">AI Simulation Scenario</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Enter simulation scenario" id="aiSimulationScenario" />
                    <Button onClick={() => handleAction(() => runAISimulation((document.getElementById('aiSimulationScenario') as HTMLInputElement).value))}>
                      Run Simulation
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Market Trends Prediction</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Timeframe" id="marketTrendsTimeframe" />
                    <Input placeholder="Assets (comma-separated)" id="marketTrendsAssets" />
                    <Button onClick={() => handleAction(() => predictMarketTrends(
                      (document.getElementById('marketTrendsTimeframe') as HTMLInputElement).value,
                      (document.getElementById('marketTrendsAssets') as HTMLInputElement).value.split(',')
                    ))}>
                      Predict Trends
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="trading">
            <Card>
              <CardHeader>
                <CardTitle>Trading Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block mb-2">Generate Trading Strategy</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Asset" id="tradingStrategyAsset" />
                    <Input placeholder="Timeframe" id="tradingStrategyTimeframe" />
                    <Button onClick={() => handleAction(() => generateTradingStrategy(
                      (document.getElementById('tradingStrategyAsset') as HTMLInputElement).value,
                      (document.getElementById('tradingStrategyTimeframe') as HTMLInputElement).value
                    ))}>
                      Generate Strategy
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Smart Contract Audit</label>
                  <Textarea placeholder="Paste smart contract code here" id="smartContractCode" />
                  <Button onClick={() => handleAction(() => auditSmartContract((document.getElementById('smartContractCode') as HTMLTextAreaElement).value))} className="mt-2">
                    Audit Contract
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="defi">
            <Card>
              <CardHeader>
                <CardTitle>DeFi Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block mb-2">Generate DeFi Strategy</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Investment Goal" id="defiStrategyGoal" />
                    <Input placeholder="Risk Tolerance" id="defiStrategyRisk" />
                    <Button onClick={() => handleAction(() => generateDeFiStrategy(
                      (document.getElementById('defiStrategyGoal') as HTMLInputElement).value,
                      (document.getElementById('defiStrategyRisk') as HTMLInputElement).value
                    ))}>
                      Generate Strategy
                    </Button>
                  </div>
                </div>
                <div>
                  <label className="block mb-2">Analyze On-Chain Data</label>
                  <div className="flex space-x-2">
                    <Input placeholder="Address" id="onChainAddress" />
                    <Input placeholder="Chain ID" id="onChainChainId" type="number" />
                    <Button onClick={() => handleAction(() => analyzeOnChainData(
                      (document.getElementById('onChainAddress') as HTMLInputElement).value,
                      parseInt((document.getElementById('onChainChainId') as HTMLInputElement).value)
                    ))}>
                      Analyze
                    </Button>
                  </div>
                </div>
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={() => generateNFTIdea("Cyberpunk")}>Generate NFT Idea</Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Generate a unique NFT collection idea</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Analyze Crypto Regulation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crypto Regulation Analysis</DialogTitle>
              <DialogDescription>
                Enter a country to analyze its cryptocurrency regulations.
              </DialogDescription>
            </DialogHeader>
            <Input id="regulationCountry" placeholder="Enter country name" />
            <Button onClick={() => handleAction(() => analyzeCryptoRegulation((document.getElementById('regulationCountry') as HTMLInputElement).value))}>
              Analyze
            </Button>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
};

export default GrandhardPage;