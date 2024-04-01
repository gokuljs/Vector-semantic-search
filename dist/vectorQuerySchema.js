export const vectorQuerySchema = (query) => {
    const agg = [
        {
            $vectorSearch: {
                index: "PlotSemanticSearch",
                path: "embeddings",
                queryVector: query,
                numCandidates: 100,
                limit: 100,
            },
        },
        {
            $project: {
                _id: 0,
                image_url: 1,
                description: 1,
                score: {
                    $meta: "vectorSearchScore",
                },
            },
        },
    ];
    return agg;
};
