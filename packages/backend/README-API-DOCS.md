# API Documentation with Scalar

This backend now uses Scalar for interactive API documentation instead of Swagger UI.

## Features

- **Modern UI**: Beautiful, responsive documentation interface
- **Interactive Testing**: Test API endpoints directly from the documentation
- **Dark Mode**: Built-in dark mode support
- **Multiple Formats**: Access OpenAPI specification in JSON or YAML format

## Endpoints

### Documentation UI

- **URL**: `/api/api-docs`
- **Description**: Interactive API documentation powered by Scalar

### OpenAPI Specification

- **JSON**: `/api/openapi.json`
- **YAML**: `/api/openapi.yaml`

### Documentation Info

- **URL**: `/api`
- **Description**: Returns links to documentation resources

## Configuration

The Scalar UI is configured in `src/presentation/routes/api-docs/index.ts` with:

- Purple theme for consistent branding
- Modern layout for better user experience
- Dark mode enabled by default
- Bearer authentication as the preferred security scheme
- Custom CSS for enhanced styling

## Usage

1. Start the backend server:

   ```bash
   npm run dev
   ```

2. Access the API documentation:
   - Open http://localhost:8000/api/api-docs in your browser
   - Or use the OpenAPI spec at http://localhost:8000/api/openapi.json

## Testing APIs

From the Scalar UI, you can:

1. Browse all available endpoints
2. View request/response schemas
3. Set authentication tokens
4. Send test requests directly
5. View response data and headers

## Benefits over Swagger UI

- **Better UX**: More intuitive and modern interface
- **Faster**: Improved performance and loading times
- **Better Mobile Support**: Responsive design works well on all devices
- **Modern Stack**: Built with modern web technologies
- **Active Development**: Regular updates and improvements

## Environment Variables

Make sure to set the required environment variables before running:

```bash
PUBLIC_SUPABASE_URL=your-supabase-url
PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
