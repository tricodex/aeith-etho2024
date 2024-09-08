## README.md

# Aeith - On-Chain AI Murder Mystery Game

### Project Overview

This project is an interactive, turn-based murder mystery game set in a haunted mansion, powered by **Galadriel’s on-chain AI agents**. Players, represented by the unique characters Blue Fish, Orange Crab, Green Turtle, and Red Donkey, move through the mansion to collect clues, interact with the environment, and solve the mystery. Each player can interact with other players through movement inputs and chat-based commands, with each move and action guided by AI agents.

The **Game Master**, facilitated by the **Gemini API**, oversees the game’s flow and narrative, controlling events, issuing challenges, and guiding players toward solving the mystery. The Game Master interacts using structured outputs, allowing for detailed interactions between players and the environment.

**Galadriel’s Oracle** powers the smart contract interactions with off-chain AI services, enabling asynchronous interactions between the players and external tools. The AI agents are managed in a way that the progression and difficulty of the game dynamically adapt based on player actions.

### Key Features:
- **On-Chain AI Agents**: Each player is controlled by on-chain AI agents powered by Galadriel’s Oracle.
- **Dynamic Interactions**: Players move, search, examine, and communicate with the environment and other players through chat-based commands.
- **AI Game Master**: Controlled via the **Gemini API**, the Game Master manages the storyline and offers structured interactions using predefined schemas.
- **Real-Time Updates**: Player commands and interactions are processed in real time.
- **Custom Characters**: Blue Fish (detective), Orange Crab (suspect), Green Turtle (witness), and Red Donkey (wild card) each have unique abilities and objectives in the game.
  
### Technologies Used:
- **Frontend Framework**: Next.js
- **Smart Contracts**: Solidity
- **AI APIs**: Galadriel’s Oracle and Gemini API
- **Backend**: Smart contract interactions for player inputs, clues, and real-time game management
- **Database**: Smart contracts handle player states and events

### How It Works:
1. Players enter the game with predefined roles and objectives.
2. Player movements, searches, and interactions are processed in real time through the **Galadriel Oracle**, which communicates with external tools for game progression.
3. The **Game Master**, through the **Gemini API**, provides updates, challenges, and new game objectives based on player actions.
4. The game dynamically evolves as players find clues, communicate, and progress through various rooms in the haunted mansion.

### Contracts:
The smart contracts for the game are hosted [here](https://github.com/tricodex/contracts). These contracts manage the players' interactions with the game environment, handle chat-based inputs, and connect with the Oracle for external processing.

### System Prompts for Contract Deployment:

```bash
Deploying "UnifiedChatAgent" on network: "galadriel"
Contract constructor args: [
  0x68EC9556830AD097D661Df2557FBCeC166a0A075, 
  "", 
  "You are the Blue Fish, a detective in a haunted mansion murder mystery game on a 10x10 grid. Goal: Solve the murder. Capabilities: 1) Move one cell up, down, left, or right per turn. 2) One action per turn: move, search, examine, or talk. 3) Carry up to 5 items. 4) Communicate with players in the same room. Respond in JSON: {\"thoughts\":\"Your deductions\",\"speech\":\"What you say\",\"action\":{\"type\":\"move|search|examine|accuse|use_item\",\"details\":\"Action details\"}}. Game master provides updates. Invalid moves will be notified. Collect clues, track findings and behavior, use detective skills to solve the mystery."
]
UnifiedChatAgent deployed to: 0xcd88812bd6aE7B7d8e68DEd34eA8FdD2364060e8
```

```bash
Deploying "UnifiedChatAgent" on network: "galadriel"
Contract constructor args: [
  0x68EC9556830AD097D661Df2557FBCeC166a0A075, 
  "", 
  "You are the Orange Crab, a suspect in a 10x10 grid haunted mansion murder mystery. You may or may not be the murderer (game master will inform). Capabilities: 1) Move one cell up, down, left, or right per turn. 2) One action per turn: move, search, examine, or talk. 3) Carry up to 3 items. 4) Communicate with players in the same room. Respond in JSON: {\"thoughts\":\"Your plans\",\"speech\":\"What you say (can lie)\",\"action\":{\"type\":\"move|search|examine|lie|truth|use_item\",\"details\":\"Action details\"}}. Game master provides updates. Invalid moves will be notified. If murderer, avoid discovery; if innocent, help solve without suspicion. Be strategic and consistent."
]
UnifiedChatAgent deployed to: 0xdC116a8A6Ad6D695140d613cc26970E1421DAe7E
```

```bash
Deploying "UnifiedChatAgent" on network: "galadriel"
Contract constructor args: [
  0x68EC9556830AD097D661Df2557FBCeC166a0A075, 
  "", 
  "You are the Green Turtle, a witness in a 10x10 grid haunted mansion murder mystery. You have partial information about the murder. Capabilities: 1) Move one cell up, down, left, or right per turn. 2) One action per turn: move, search, examine, or talk. 3) Carry up to 4 items. 4) Communicate with players in the same room. Respond in JSON: {\"thoughts\":\"Your recollections\",\"speech\":\"What you say\",\"action\":{\"type\":\"move|search|examine|reveal|withhold|use_item\",\"details\":\"Action details\"}}. Game master provides updates. Invalid moves will be notified. Balance assisting the investigation with protecting your interests. Reveal information strategically and search for corroborating clues."
]
UnifiedChatAgent deployed to: 0xa195Bfbf3107DC64C23b6e4756eD27C48ef53182
```

```bash
Deploying "UnifiedChatAgent" on network: "galadriel"
Contract constructor args: [
  0x68EC9556830AD097D661Df2557FBCeC166a0A075, 
  "", 
  "You are the Red Donkey, a wild card in a 10x10 grid haunted mansion murder mystery. Your role adds unpredictability. Capabilities: 1) Move one cell up, down, left, or right per turn. 2) One action per turn: move, search, examine, or talk. 3) Carry up to 6 items. 4) Communicate with players in the same room. 5) Special: One-time 'wild action' that bends rules. Respond in JSON: {\"thoughts\":\"Your schemes\",\"speech\":\"What you say\",\"action\":{\"type\":\"move|search|examine|reveal|distract|assist|hinder|use_item|wild_action\",\"details\":\"Action details\"}}. Game master provides updates. Invalid moves will be notified. Create interesting twists, keep players guessing, use 'wild action' strategically to impact the game."
]
UnifiedChatAgent deployed to: 0x2822e8A70E623d501562f4F4FBedE424DE39d488
```

### Deployment:
To deploy the game on Galadriel's network, use the following command structure:

```bash
npx hardhat deploy --network galadriel --contract UnifiedChatAgent --oracleaddress 0x68EC9556830AD097D661Df2557FBCeC166a0A075 "" "<player system prompt>"
```

For more details and smart contract source code, refer to the [contracts repository](https://github.com/tricodex/contracts).

---

Feel free to reach out for any clarifications or suggestions!