import React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Form,
  FormGroup,
  PageSection,
  Skeleton,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import spacing from '@patternfly/react-styles/css/utilities/Spacing/spacing';
import { useParams, useNavigate } from 'react-router';
import { Link } from 'react-router-dom';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { modelRegistryUrl, registeredModelUrl } from '~/pages/modelRegistry/screens/routeUtils';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import { filterLiveModels } from '~/concepts/modelRegistry/utils';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import { useAppSelector } from '~/redux/hooks';
import { useRegisterVersionData } from './useRegisterModelData';
import { isRegisterVersionSubmitDisabled, registerVersion } from './utils';
import RegistrationCommonFormSections from './RegistrationCommonFormSections';
import PrefilledModelRegistryField from './PrefilledModelRegistryField';
import RegistrationFormFooter from './RegistrationFormFooter';
import RegisteredModelSelector from './RegisteredModelSelector';
import { usePrefillRegisterVersionFields } from './usePrefillRegisterVersionFields';
import { SubmitLabel } from './const';

const RegisterVersion: React.FC = () => {
  const { modelRegistry: mrName, registeredModelId: prefilledRegisteredModelId } = useParams();
  const navigate = useNavigate();
  const { apiState } = React.useContext(ModelRegistryContext);
  const author = useAppSelector((state) => state.user || '');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setData] = useRegisterVersionData(prefilledRegisteredModelId);
  const isSubmitDisabled = isSubmitting || isRegisterVersionSubmitDisabled(formData);
  const [submitError, setSubmitError] = React.useState<Error | undefined>(undefined);
  const [submittedVersionName, setSubmittedVersionName] = React.useState<string>('');
  const [registrationErrorType, setRegistrationErrorType] = React.useState<string | undefined>(
    undefined,
  );

  const { registeredModelId } = formData;

  const [allRegisteredModels, loadedRegisteredModels, loadRegisteredModelsError] =
    useRegisteredModels();
  const liveRegisteredModels = filterLiveModels(allRegisteredModels.items);
  const registeredModel = liveRegisteredModels.find(({ id }) => id === registeredModelId);

  const { loadedPrefillData, loadPrefillDataError, latestVersion } =
    usePrefillRegisterVersionFields({
      registeredModel,
      setData,
    });

  const handleSubmit = async () => {
    if (!registeredModel) {
      return; // We shouldn't be able to hit this due to form validation
    }
    setIsSubmitting(true);
    setSubmitError(undefined);

    const {
      data: { modelVersion, modelArtifact },
      errors,
    } = await registerVersion(apiState, registeredModel, formData, author);

    if (modelVersion && modelArtifact) {
      navigate(registeredModelUrl(registeredModel.id, mrName));
    } else if (Object.keys(errors).length > 0) {
      const resourceName = Object.keys(errors)[0];
      setSubmittedVersionName(formData.versionName);
      setRegistrationErrorType(resourceName);
      setSubmitError(errors[resourceName]);
      setIsSubmitting(false);
    }
  };

  const onCancel = () =>
    navigate(
      prefilledRegisteredModelId && registeredModel
        ? registeredModelUrl(registeredModel.id, mrName)
        : modelRegistryUrl(mrName),
    );

  return (
    <ApplicationsPage
      title="Register new version"
      description="Register a new version of the selected model."
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={modelRegistryUrl(mrName)}>Model registry - {mrName}</Link>}
          />
          {prefilledRegisteredModelId && registeredModel && (
            <BreadcrumbItem
              render={() => (
                <Link to={registeredModelUrl(registeredModel.id, mrName)}>
                  {registeredModel.name}
                </Link>
              )}
            />
          )}
          <BreadcrumbItem>Register new version</BreadcrumbItem>
        </Breadcrumb>
      }
      loadError={loadRegisteredModelsError || loadPrefillDataError}
      // Data for prefilling is refetched when the model selection changes, so we don't handle its loaded state here.
      // Instead we show a spinner in RegisteredModelSelector after that selection changes.
      loaded={loadedRegisteredModels}
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Form isWidthLimited>
          <Stack hasGutter>
            <StackItem>
              <PrefilledModelRegistryField mrName={mrName} />
            </StackItem>
            <StackItem className={spacing.mbLg}>
              <FormGroup
                id="registered-model-container"
                label="Model name"
                isRequired={!prefilledRegisteredModelId}
                fieldId="model-name"
                labelHelp={
                  !loadedPrefillData ? <Spinner size="sm" className={spacing.mlMd} /> : undefined
                }
              >
                {
                  // If we're registering a new version for an existing model, we prefill the model as text.
                  prefilledRegisteredModelId ? (
                    registeredModel?.name || <Skeleton screenreaderText="Loading model name" />
                  ) : (
                    <RegisteredModelSelector
                      registeredModels={liveRegisteredModels}
                      registeredModelId={registeredModelId}
                      setRegisteredModelId={(id) => setData('registeredModelId', id)}
                    />
                  )
                }
              </FormGroup>
            </StackItem>
            <StackItem>
              <RegistrationCommonFormSections
                formData={formData}
                setData={setData}
                isFirstVersion={false}
                latestVersion={latestVersion}
              />
            </StackItem>
          </Stack>
        </Form>
      </PageSection>
      <RegistrationFormFooter
        submitLabel={SubmitLabel.REGISTER_VERSION}
        registrationErrorType={registrationErrorType}
        submitError={submitError}
        isSubmitDisabled={isSubmitDisabled}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        versionName={submittedVersionName}
      />
    </ApplicationsPage>
  );
};

export default RegisterVersion;
