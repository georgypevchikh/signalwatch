-- Seed initial tracked topics
insert into tracked_topics (name, keywords, excluded_keywords) values
  (
    'AI & Machine Learning',
    array['ai', 'artificial intelligence', 'machine learning', 'llm', 'gpt', 'claude',
          'openai', 'anthropic', 'deep learning', 'neural network', 'transformer',
          'fine-tuning', 'rag', 'embeddings', 'diffusion', 'multimodal'],
    array['crypto ai', 'nft ai']
  ),
  (
    'Developer Tools & Automation',
    array['developer tools', 'devtools', 'automation', 'ci/cd', 'github actions',
          'n8n', 'zapier', 'make.com', 'workflow automation', 'api', 'webhook',
          'sdk', 'cli tool', 'code generation', 'copilot'],
    array[]::text[]
  ),
  (
    'Security',
    array['security', 'vulnerability', 'cve', 'breach', 'zero-day', 'ransomware',
          'supply chain attack', 'authentication', 'oauth', 'encryption', 'pentesting'],
    array[]::text[]
  );
