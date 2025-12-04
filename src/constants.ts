

export const EMBEDDING_DIMENSION = 768;

export const SAMPLE_TEXTS = [
    // Technology & AI
    "A rigorous lattice and logic laboratory for AI reasoning systems.",
    "The /analytic/ module provides a verified core with certified data.",
    "The /heuristic/ namespace is a sandbox for experimental, unverified searches.",
    "Outputs from heuristics are excluded from formal analytic guarantees.",
    "The E_8 lattice is known for its kissing number of 240.",
    "Canonical invariants for the D_4 family include its minimal norm and density.",
    "Lattice-Stabilized Diffusion provides stability controls for VAEs.",
    "Memory quantization stubs are exposed by the AI interface.",
    "Neural network architecture optimization is a complex task.",
    "Recurrent neural networks are used for sequential data.",
    "Convolutional layers detect spatial hierarchies of features.",
    "The transformer model relies on self-attention mechanisms.",
    "Gradient descent minimizes the loss function.",
    "Overfitting occurs when a model learns the training data too well.",
    "A generative adversarial network consists of a generator and a discriminator.",

    // Nature
    "The sun dipped below the horizon, painting the sky in fiery hues.",
    "A gentle breeze whispered through the tall pine trees.",
    "The river carved a path through the ancient valley.",
    "Eagles soar on thermal updrafts high above the cliffs.",
    "Photosynthesis converts light into chemical energy.",
    "The ecosystem is a delicate balance of predators and prey.",
    "Coral reefs are biodiversity hotspots in the ocean.",
    "The forest floor was a tapestry of moss and fallen leaves.",
    "The moon cast long shadows across the silent landscape.",
    "Migratory birds travel thousands of miles each year.",
    "A volcano is a rupture in the crust of a planetary-mass object.",

    // Literature & Philosophy
    "To be, or not to be, that is the question.",
    "All that is gold does not glitter.",
    "It was the best of times, it was the worst of times.",
    "The only true wisdom is in knowing you know nothing.",
    "I think, therefore I am.",
    "The unexamined life is not worth living.",
    "We are what we repeatedly do. Excellence, then, is not an act, but a habit.",
    "Two roads diverged in a wood, and I—I took the one less traveled by.",
    "He who has a why to live can bear almost any how.",
    "The journey of a thousand miles begins with a single step.",
    "All happy families are alike; each unhappy family is unhappy in its own way.",

    // Simple Facts & Concepts
    "The Earth revolves around the Sun.",
    "Water is composed of hydrogen and oxygen atoms.",
    "Gravity is the force that attracts two bodies to each other.",
    "A square has four equal sides and four right angles.",
    "The capital of France is Paris.",
    "Sound travels faster in water than in air.",
    "Red, green, and blue are primary colors of light.",
    "An integer is a whole number that can be positive, negative, or zero.",
    "A triangle has three sides and three angles.",
    "The mitochondria is the powerhouse of the cell.",
    "Velocity is speed in a given direction.",
    "The chemical symbol for gold is Au.",
    "A decade is a period of ten years.",
    "The Pacific Ocean is the largest and deepest of Earth's five oceans.",
    "Binary code uses the digits 0 and 1."
];


// Using real Unsplash images for semantic analysis.
// We choose 3 VERY distinct categories to allow the user to visually verify 
// if the compression preserves the semantic clusters (PCA separation).
export const SAMPLE_IMAGES = [
    // GROUP 1: Cats (Organic, Subject-Focused)
    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=400&h=400", // Cat Close up
    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=400&h=400", // Cat Eyes
    "https://images.unsplash.com/photo-1495360019602-e05980bf543a?auto=format&fit=crop&w=400&h=400", // Cat Profile
    "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?auto=format&fit=crop&w=400&h=400", // Cat Sunglasses
    "https://images.unsplash.com/photo-1592194996308-7b43878e84a6?auto=format&fit=crop&w=400&h=400", // Orange Cat

    // GROUP 2: Cyberpunk/Neon (Synthetic, High Contrast, Urban)
    "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=400&h=400", // Neon Sign
    "https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=400&h=400", // Neon City
    "https://images.unsplash.com/photo-1580698543091-88c7bc420591?auto=format&fit=crop&w=400&h=400", // Cyberpunk Street
    "https://images.unsplash.com/photo-1605218427360-6961d37485d8?auto=format&fit=crop&w=400&h=400", // Holographic
    "https://images.unsplash.com/photo-1504608524841-42fe6f032b4b?auto=format&fit=crop&w=400&h=400", // Data Stream

    // GROUP 3: Nature/Landscapes (Organic, Wide, Earth Tones)
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=400&h=400", // Foggy Forest
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&h=400", // Sunlight Woods
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=400&h=400", // Mountains
    "https://images.unsplash.com/photo-1501854140884-074bf96de746?auto=format&fit=crop&w=400&h=400", // Beach
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&h=400", // Alone Nature
];